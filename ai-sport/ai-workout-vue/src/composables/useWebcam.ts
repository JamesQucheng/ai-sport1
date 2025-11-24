import { ref, type Ref } from 'vue'

export interface WebcamConfig {
  width: number
  height: number
}

export class WebcamHandler {
  private _webcamElement: HTMLVideoElement
  private _addVideoConfig: WebcamConfig = { width: 640, height: 360 }
  private _facingMode: string = 'user' // environment or user
  private _webcamList: MediaDeviceInfo[] = []
  private _streamList: MediaStream[] = []
  private _selectedDeviceId: string = ''

  constructor(webcamElement: HTMLVideoElement, facingMode: string = 'user') {
    this._webcamElement = webcamElement
    this._facingMode = facingMode
  }

  get facingMode(): string {
    return this._facingMode
  }

  set facingMode(value: string) {
    this._facingMode = value
  }

  get webcamList(): MediaDeviceInfo[] {
    return this._webcamList
  }

  get webcamCount(): number {
    return this._webcamList.length
  }

  get selectedDeviceId(): string {
    return this._selectedDeviceId
  }

  set addVideoConfig(config: WebcamConfig) {
    this._addVideoConfig = config
  }

  /* Get all video input devices info */
  getVideoInputs(mediaDevices: MediaDeviceInfo[]): MediaDeviceInfo[] {
    this._webcamList = []
    mediaDevices.forEach((mediaDevice) => {
      if (mediaDevice.kind === 'videoinput') {
        this._webcamList.push(mediaDevice)
      }
    })
    if (this._webcamList.length === 1) {
      this._facingMode = 'user'
    }
    return this._webcamList
  }

  /* Get media constraints */
  getMediaConstraints(): MediaStreamConstraints {
    let videoConstraints: any = {}
    if (this._selectedDeviceId === '') {
      videoConstraints.facingMode = this._facingMode
    } else {
      videoConstraints.deviceId = { exact: this._selectedDeviceId }
    }
    videoConstraints = {
      ...videoConstraints,
      ...this._addVideoConfig,
    }
    const constraints: MediaStreamConstraints = {
      video: videoConstraints,
      audio: false,
    }
    return constraints
  }

  /* Select camera based on facingMode */
  selectCamera(): void {
    for (const webcam of this._webcamList) {
      if (
        (this._facingMode === 'user' &&
          webcam.label.toLowerCase().includes('front')) ||
        (this._facingMode === 'environment' &&
          webcam.label.toLowerCase().includes('back'))
      ) {
        this._selectedDeviceId = webcam.deviceId
        break
      }
    }
  }

  /* Change Facing mode and selected camera */
  flip(mode: string): void {
    this._facingMode = mode
    if (this._facingMode === 'user') {
      this._webcamElement.style.transform = 'scale(-1,1)'
    } else {
      this._webcamElement.style.transform = ''
    }
    this.selectCamera()
  }

  /*
    1. Get permission from user
    2. Get all video input devices info
    3. Select camera based on facingMode 
    4. Start stream
  */
  async start(startStream: boolean = true): Promise<string> {
    return new Promise((resolve, reject) => {
      this.stop()
      navigator.mediaDevices
        .getUserMedia(this.getMediaConstraints()) // get permission from user
        .then((stream) => {
          this._streamList.push(stream)
          this.info() // get all video input devices info
            .then(() => {
              this.selectCamera() // select camera based on facingMode
              if (startStream) {
                this.stream()
                  .then(() => {
                    resolve(this._facingMode)
                  })
                  .catch((error) => {
                    reject(error)
                  })
              } else {
                resolve(this._selectedDeviceId)
              }
            })
            .catch((error) => {
              reject(error)
            })
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  /* Get all video input devices info */
  async info(): Promise<MediaDeviceInfo[]> {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices
        .enumerateDevices()
        .then((devices) => {
          this.getVideoInputs(devices)
          resolve(this._webcamList)
        })
        .catch((error) => {
          reject(error)
        })
    })
  }

  /* Start streaming webcam to video element */
  async stream(): Promise<string> {
    return new Promise((resolve, reject) => {
      navigator.mediaDevices
        .getUserMedia(this.getMediaConstraints())
        .then((stream) => {
          this._streamList.push(stream)
          this._webcamElement.srcObject = stream
          if (this._facingMode === 'user') {
            this._webcamElement.style.transform = 'scale(-1,1)'
          }
          this._webcamElement.play()
          resolve(this._facingMode)
        })
        .catch((error) => {
          console.log(error)
          reject(error)
        })
    })
  }

  /* Stop streaming webcam */
  stop(): void {
    this._streamList.forEach((stream) => {
      stream.getTracks().forEach((track) => {
        track.stop()
      })
    })
    this._streamList = []
  }
}

export function useWebcam() {
  const webcamHandler: Ref<WebcamHandler | null> = ref(null)
  const isWebcamActive: Ref<boolean> = ref(false)
  const facingMode: Ref<string> = ref('user')
  const webcamList: Ref<MediaDeviceInfo[]> = ref([])

  const initWebcam = (videoElement: HTMLVideoElement, config: WebcamConfig) => {
    webcamHandler.value = new WebcamHandler(videoElement, facingMode.value)
    webcamHandler.value.addVideoConfig = config
  }

  const startWebcam = async (): Promise<string> => {
    if (!webcamHandler.value) {
      throw new Error('Webcam not initialized')
    }
    try {
      const result = await webcamHandler.value.start()
      isWebcamActive.value = true
      webcamList.value = webcamHandler.value.webcamList
      return result
    } catch (error) {
      isWebcamActive.value = false
      throw error
    }
  }

  const stopWebcam = (): void => {
    if (webcamHandler.value) {
      webcamHandler.value.stop()
      isWebcamActive.value = false
    }
  }

  const flipCamera = (mode: string): void => {
    if (webcamHandler.value) {
      webcamHandler.value.flip(mode)
      facingMode.value = mode
    }
  }

  return {
    webcamHandler,
    isWebcamActive,
    facingMode,
    webcamList,
    initWebcam,
    startWebcam,
    stopWebcam,
    flipCamera
  }
}
