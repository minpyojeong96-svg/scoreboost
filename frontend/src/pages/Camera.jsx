import { useRef, useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

const BRIGHTNESS_MIN = 60
const BRIGHTNESS_MAX = 230
const TILT_MAX = 20
const LAPLACIAN_MIN = 30

function computeBrightness(ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h)
  let sum = 0
  for (let i = 0; i < data.length; i += 4) {
    sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
  }
  return sum / (data.length / 4)
}

function computeLaplacianVariance(ctx, w, h) {
  const { data } = ctx.getImageData(0, 0, w, h)
  const gray = []
  for (let i = 0; i < data.length; i += 4) {
    gray.push(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2])
  }

  let sum = 0, sumSq = 0, count = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x
      const lap =
        -gray[idx - w - 1] - gray[idx - w] - gray[idx - w + 1]
        - gray[idx - 1] + 8 * gray[idx] - gray[idx + 1]
        - gray[idx + w - 1] - gray[idx + w] - gray[idx + w + 1]
      sum += lap
      sumSq += lap * lap
      count++
    }
  }
  const mean = sum / count
  return sumSq / count - mean * mean
}

export default function Camera() {
  const navigate = useNavigate()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const checkRef = useRef(null)
  const streamRef = useRef(null)
  const orientRef = useRef({ beta: 0, gamma: 0 })
  const hasOrientRef = useRef(false) // deviceorientation 이벤트 수신 여부

  const [status, setStatus] = useState({ brightness: false, angle: true, focus: false })
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)

  const allGood = status.brightness && status.angle && status.focus

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
    } catch {
      setError('카메라 권한이 필요합니다')
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    clearInterval(checkRef.current)
  }, [])

  useEffect(() => {
    startCamera()

    const handleOrientation = (e) => {
      hasOrientRef.current = true
      orientRef.current = { beta: e.beta ?? 90, gamma: e.gamma ?? 0 }
    }
    window.addEventListener('deviceorientation', handleOrientation)

    checkRef.current = setInterval(() => {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) return

      const w = 320, h = 180
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, w, h)

      const brightness = computeBrightness(ctx, w, h)
      const variance = computeLaplacianVariance(ctx, w, h)

      // 기기 방향 이벤트가 없으면(데스크탑 등) 각도 OK 처리
      let angleOk = true
      if (hasOrientRef.current) {
        const { beta, gamma } = orientRef.current
        const tilt = Math.max(Math.abs(beta - 90), Math.abs(gamma))
        angleOk = tilt <= TILT_MAX
      }

      setStatus({
        brightness: brightness >= BRIGHTNESS_MIN && brightness <= BRIGHTNESS_MAX,
        angle: angleOk,
        focus: variance >= LAPLACIAN_MIN
      })
    }, 500)

    return () => {
      stopCamera()
      window.removeEventListener('deviceorientation', handleOrientation)
    }
  }, [startCamera, stopCamera])

  const capture = () => {
    const video = videoRef.current
    if (!video || video.videoWidth === 0 || video.readyState < 2) {
      setError('카메라가 아직 준비 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }
    // OCR 정확도를 유지하면서 파일 크기 축소 (최대 1024px)
    const MAX_W = 1024
    const scale = Math.min(1, MAX_W / video.videoWidth)
    const w = Math.floor(video.videoWidth * scale)
    const h = Math.floor(video.videoHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d').drawImage(video, 0, 0, w, h)
    const base64 = canvas.toDataURL('image/jpeg', 0.75)
    stopCamera()
    setPreview(base64)
  }

  const retake = () => {
    setPreview(null)
    setStatus({ brightness: false, angle: true, focus: false })
    startCamera()
  }

  const analyze = () => {
    navigate('/result', { state: { image: preview } })
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 gap-4">
        <p className="text-red-500 text-center">{error}</p>
        <button
          onClick={() => { setError(null); startCamera() }}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl"
        >
          다시 시도
        </button>
      </div>
    )
  }

  if (preview) {
    return (
      <div className="flex flex-col h-full bg-black">
        <img src={preview} alt="촬영 미리보기" className="flex-1 object-contain" />
        <div className="flex gap-3 p-4 bg-black">
          <button
            onClick={retake}
            className="flex-1 py-3 border border-white text-white rounded-xl font-medium"
          >
            다시 찍기
          </button>
          <button
            onClick={analyze}
            className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold"
          >
            분석 시작
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-black">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        {/* 가이드 프레임 오버레이 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-4/5 h-3/5">
            <div className="absolute inset-0 border-0" style={{
              boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
              borderRadius: '8px'
            }} />
            <div className={`absolute inset-0 rounded-lg border-2 transition-colors ${allGood ? 'border-green-400' : 'border-white/60'}`} />
            {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
              <div key={i} className={`absolute w-6 h-6 ${pos} border-2 ${allGood ? 'border-green-400' : 'border-white'} rounded-sm`} />
            ))}
          </div>
        </div>

        {/* 상태 바 */}
        <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 px-4">
          {[
            { key: 'brightness', label: '밝기' },
            { key: 'angle', label: '각도' },
            { key: 'focus', label: '초점' }
          ].map(({ key, label }) => (
            <span
              key={key}
              className={`px-3 py-1 rounded-full text-xs font-medium ${
                status[key] ? 'bg-green-500 text-white' : 'bg-white/20 text-white'
              }`}
            >
              {status[key] ? '✓' : '○'} {label}
            </span>
          ))}
        </div>

        {/* 안내 메시지 */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          <span className="px-4 py-2 bg-black/60 text-white text-sm rounded-full text-center">
            {!status.brightness && '💡 조명을 밝게 해주세요'}
            {status.brightness && !status.angle && '📐 카메라를 똑바로 해주세요'}
            {status.brightness && status.angle && !status.focus && '🔍 더 가까이 또는 멀리 해주세요'}
            {allGood && '✅ 촬영 준비 완료!'}
          </span>
        </div>
      </div>

      {/* 촬영 버튼 — 조건 미충족이어도 누를 수 있음 (경고 색상만 다름) */}
      <div className="flex flex-col items-center py-6 bg-black gap-2">
        <button
          onClick={capture}
          className={`w-20 h-20 rounded-full border-4 transition-all active:scale-90 ${
            allGood
              ? 'border-white bg-white/20'
              : 'border-yellow-400 bg-yellow-400/20'
          }`}
        >
          <span className="sr-only">촬영</span>
        </button>
        {!allGood && (
          <p className="text-yellow-400 text-xs">조건 미충족 — 그래도 촬영 가능</p>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
