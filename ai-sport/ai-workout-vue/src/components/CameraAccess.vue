<template>
  <div class="flex flex-row justify-center h-screen items-center w-full z-40 bg-gray-700 absolute inset-0 overflow-hidden max-h-screen">
    <div class="flex flex-col items-center max-w-sm w-full bg-white max-h-96 h-full shadow-md p-3 rounded-lg text-gray-500">
      <div class="flex-1 flex flex-col overflow-y-auto h-full items-center w-full">
        <h1 class="font-bold text-2xl my-3">Allow Camera Access</h1>
        <img
          src="./img/undraw_taking_selfie_re_wlgd.svg"
          alt="Illustration of Camera Access"
          class="w-1/2 mb-3"
        />
        <p class="text-center text-sm px-5">
          Please provide us access to your camera, which is required for Pose Detector
        </p>
      </div>
      <div
        @click="requestCameraAccess"
        class="w-full bg-yellow-500 text-white py-2 text-xl font-bold rounded-lg mb-2 mt-5 hover:bg-amber-500 text-center cursor-pointer"
      >
        Grant Permission
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  cameraGranted: []
}>()

const requestCameraAccess = async () => {
  try {
    // 请求摄像头权限
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { width: 640, height: 360 },
      audio: false 
    })
    
    // 立即停止流，我们只是检查权限
    stream.getTracks().forEach(track => track.stop())
    
    // 通知父组件权限已获得
    emit('cameraGranted')
  } catch (error) {
    console.error('Camera access denied:', error)
    alert('摄像头访问被拒绝，请刷新页面重试')
  }
}
</script>
