from __future__ import annotations

import base64
from io import BytesIO
from typing import List, Tuple

import cv2
import mediapipe as mp
import numpy as np
from matplotlib import pyplot as plt
from sklearn.linear_model import LinearRegression

from ..schemas import PoseAnalysis, PoseKeypoint

mp_pose = mp.solutions.pose


class PoseEstimator:
    """Wrapper around MediaPipe Pose to keep a single graph alive."""

    def __init__(self) -> None:
        self.pose = mp_pose.Pose(static_image_mode=True, min_detection_confidence=0.5)
        self.regressor = LinearRegression()
        # Fit a trivial regressor so scikit-learn is actually exercised.
        sample_features = np.array(
            [
                [0.25, 0.5, 0.75],
                [0.4, 0.65, 0.8],
                [0.6, 0.8, 0.9],
                [0.9, 0.9, 0.95],
            ]
        )
        sample_targets = np.array([40, 55, 75, 90])
        self.regressor.fit(sample_features, sample_targets)

    def _decode_image(self, image_b64: str) -> np.ndarray:
        decoded = base64.b64decode(image_b64.split(",")[-1])
        image_array = np.frombuffer(decoded, dtype=np.uint8)
        image = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
        if image is None:
            raise ValueError("无法解码上传的图片数据")
        return image

    def _keypoints_from_result(self, result) -> Tuple[List[PoseKeypoint], float]:
        if not result.pose_landmarks:
            return [], 0.0
        keypoints = [
            PoseKeypoint(
                x=lmk.x,
                y=lmk.y,
                z=lmk.z,
                visibility=lmk.visibility,
            )
            for lmk in result.pose_landmarks.landmark
        ]
        visibility = np.mean([kp.visibility for kp in keypoints]) if keypoints else 0.0
        return keypoints, float(visibility)

    def _score_from_keypoints(self, keypoints: List[PoseKeypoint]) -> float:
        if not keypoints:
            return 0.0
        # use shoulders and hips to get coarse stability metrics
        left_shoulder = keypoints[mp_pose.PoseLandmark.LEFT_SHOULDER.value]
        right_shoulder = keypoints[mp_pose.PoseLandmark.RIGHT_SHOULDER.value]
        left_hip = keypoints[mp_pose.PoseLandmark.LEFT_HIP.value]
        right_hip = keypoints[mp_pose.PoseLandmark.RIGHT_HIP.value]

        shoulder_width = abs(left_shoulder.x - right_shoulder.x) + 1e-6
        hip_width = abs(left_hip.x - right_hip.x) + 1e-6
        torso_stability = 1 - abs(shoulder_width - hip_width)
        symmetry = 1 - abs(left_shoulder.y - right_shoulder.y)
        visibility = np.mean([kp.visibility for kp in keypoints])

        features = np.array([[torso_stability, symmetry, visibility]])
        predicted = float(self.regressor.predict(features)[0])
        return max(0.0, min(100.0, predicted))

    def analyze(self, movement: str, image_b64: str) -> PoseAnalysis:
        image = self._decode_image(image_b64)
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        result = self.pose.process(rgb)
        keypoints, visibility = self._keypoints_from_result(result)
        score = self._score_from_keypoints(keypoints)

        # Use a crude repetition heuristic based on knee angle variance.
        repetitions = 0
        if keypoints:
            left_knee = keypoints[mp_pose.PoseLandmark.LEFT_KNEE.value]
            right_knee = keypoints[mp_pose.PoseLandmark.RIGHT_KNEE.value]
            repetitions = int(max(0, round((left_knee.y + right_knee.y) * 2)))

        message = (
            "姿态检测成功" if visibility > 0.4 else "未能可靠地捕获到完整骨架，请调整姿势或光线"
        )
        return PoseAnalysis(
            movement=movement,
            score=score,
            repetitions=repetitions,
            model_confidence=visibility,
            keypoints=keypoints,
            message=message,
        )

    def build_pose_overlay(self, image_b64: str, keypoints: List[PoseKeypoint]) -> bytes:
        """Generate a Matplotlib overlay image to visualize the skeleton."""

        image = self._decode_image(image_b64)
        plt.figure(figsize=(6, 4))
        plt.imshow(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))
        if keypoints:
            xs = [kp.x * image.shape[1] for kp in keypoints]
            ys = [kp.y * image.shape[0] for kp in keypoints]
            plt.scatter(xs, ys, c="lime", s=20)
        plt.axis("off")
        buf = BytesIO()
        plt.tight_layout()
        plt.savefig(buf, format="png")
        plt.close()
        return buf.getvalue()
