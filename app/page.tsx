"use client"

import { useEffect, useRef, useState } from 'react'

interface CameraState {
  isLoading: boolean
  showPreview: boolean
  capturedImage: string | null
}

export default function CameraApp() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [state, setState] = useState<CameraState>({
    isLoading: true,
    showPreview: false,
    capturedImage: null
  })
  const [loadingMessage, setLoadingMessage] = useState('Kamera başlatılıyor...')
  const retryCount = useRef(0)
  const maxRetries = 3

  const initializeCamera = async () => {
    try {
      setLoadingMessage('Kamera izni bekleniyor...')

      // Mevcut stream'i temizle
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1080 },
          height: { ideal: 1080 },
          facingMode: 'user'
        }
      })

      setLoadingMessage('Kamera başlatılıyor...')

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        // Video hazır olana kadar bekle
        await new Promise((resolve, reject) => {
          if (!videoRef.current) return reject('Video elementi bulunamadı')

          videoRef.current.onloadedmetadata = async () => {
            try {
              await videoRef.current?.play()
              resolve(true)
            } catch (err) {
              reject(err)
            }
          }

          // Timeout ekle
          setTimeout(() => {
            reject('Video yükleme zaman aşımı')
          }, 10000) // 10 saniye timeout
        })

        // Başarılı
        retryCount.current = 0
        setLoadingMessage('Kamera hazır!')
      }
    } catch (error) {
      console.error('Kamera başlatma hatası:', error)
      
      // Yeniden deneme mantığı
      if (retryCount.current < maxRetries) {
        retryCount.current++
        setLoadingMessage(`Kamera yeniden başlatılıyor... (Deneme ${retryCount.current}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, 1000))
        return initializeCamera()
      } else {
        setLoadingMessage('Kamera başlatılamadı. Lütfen sayfayı yenileyin.')
      }
    }
  }

  useEffect(() => {
    let timeoutId: NodeJS.Timeout

    // Hemen kamerayı başlat
    initializeCamera()

    // 2 saniye sonra loading ekranını kaldır
    timeoutId = setTimeout(() => {
      setState(prev => ({ ...prev, isLoading: false }))
    }, 2000)

    return () => {
      clearTimeout(timeoutId)
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
        tracks.forEach(track => track.stop())
      }
    }
  }, [])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    
    // Video elementinin görünen boyutlarını al
    const videoElement = videoRef.current
    const videoRect = videoElement.getBoundingClientRect()
    
    // Canvas boyutlarını video görüntüsüyle eşitle
    const size = Math.min(videoRect.width, videoRect.height)
    canvas.width = size
    canvas.height = size
    
    const context = canvas.getContext('2d')
    if (!context) return
    
    // Video görüntüsünün merkezini al
    const sx = (video.videoWidth - video.videoHeight) / 2
    const sy = 0
    const sSize = video.videoHeight

    // Ayna görüntüsü için
    context.scale(-1, 1)
    context.drawImage(
      video,
      sx, sy, sSize, sSize, // Kaynak koordinatları
      -canvas.width, 0, canvas.width, canvas.height // Hedef koordinatları
    )
    context.scale(-1, 1)
    
    const imageData = canvas.toDataURL('image/jpeg', 1.0)
    setState(prev => ({
      ...prev,
      showPreview: true,
      capturedImage: imageData
    }))
  }

  const handlePrint = () => {
    if (!state.capturedImage) return

    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Fotoğraf Baskısı</title>
            <style>
              @page {
                size: 89mm 89mm; /* Kare sticker boyutu */
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                justify-content: center;
                align-items: center;
                background: white;
              }
              img {
                width: 89mm;
                height: 89mm;
                object-fit: cover;
                display: block;
              }
              @media print {
                html, body {
                  width: 89mm;
                  height: 89mm;
                  margin: 0;
                  padding: 0;
                }
                img {
                  position: fixed;
                  top: 0;
                  left: 0;
                  margin: 0;
                  padding: 0;
                }
              }
            </style>
          </head>
          <body>
            <img 
              src="${state.capturedImage}" 
              onload="setTimeout(() => { window.print(); window.close(); }, 100)"
            />
          </body>
        </html>
      `)
      printWindow.document.close()
    }

    // Yazdırma sonrası kamera ekranına dön
    setState(prev => ({
      ...prev,
      showPreview: false,
      capturedImage: null
    }))
  }

  const handleBack = () => {
    setState(prev => ({
      ...prev,
      showPreview: false,
      capturedImage: null
    }))
  }

  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <div className="camera-container">
        <div className="fullscreen-square">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
          />
          <canvas ref={canvasRef} className="hidden-canvas" />
          
          {!state.showPreview && (
            <button className="capture-button" onClick={capturePhoto}>
              <span className="capture-button-inner" />
            </button>
          )}

          {state.showPreview && state.capturedImage && (
            <div className="preview-overlay">
              <img 
                src={state.capturedImage} 
                alt="Çekilen fotoğraf" 
                className="preview-image"
              />
              <div className="button-group">
                <button className="back-button" onClick={handleBack}>
                  Geri
                </button>
                <button className="print-button" onClick={handlePrint}>
                  Onayla
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {state.isLoading && (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
          <p>{loadingMessage}</p>
        </div>
      )}
    </main>
  )
}
