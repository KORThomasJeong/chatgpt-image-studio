import React, { useRef, useEffect, useState, useCallback } from 'react'

interface MaskCanvasProps {
  imageUrl: string
  width: number
  height: number
  onMaskChange: (maskDataUrl: string | null) => void
}

type Tool = 'brush' | 'eraser'

export default function MaskCanvas({ imageUrl, width, height, onMaskChange }: MaskCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>('brush')
  const [brushSize, setBrushSize] = useState(32)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasMask, setHasMask] = useState(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  // Initialize canvas with fully transparent background (no pre-drawn content)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
  }, [width, height])

  const getPos = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
        | MouseEvent
        | TouchEvent,
      canvas: HTMLCanvasElement
    ) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      let clientX: number, clientY: number
      if ('touches' in e) {
        clientX = e.touches[0]?.clientX ?? e.changedTouches[0]?.clientX ?? 0
        clientY = e.touches[0]?.clientY ?? e.changedTouches[0]?.clientY ?? 0
      } else {
        clientX = (e as MouseEvent).clientX
        clientY = (e as MouseEvent).clientY
      }
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      }
    },
    []
  )

  const drawStroke = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      from: { x: number; y: number },
      to: { x: number; y: number }
    ) => {
      ctx.beginPath()
      if (tool === 'brush') {
        // Paint opaque white — user marks areas to edit
        ctx.globalCompositeOperation = 'source-over'
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)'
      } else {
        // Eraser — remove paint (go back to transparent)
        ctx.globalCompositeOperation = 'destination-out'
        ctx.strokeStyle = 'rgba(0,0,0,1)'
      }
      ctx.lineWidth = brushSize
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)
      ctx.stroke()
      ctx.globalCompositeOperation = 'source-over'
    },
    [tool, brushSize]
  )

  const exportMask = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // We need to invert: user painted areas to edit (white) → transparent in export
    // OpenAI mask: TRANSPARENT = edit, OPAQUE = keep
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = width
    exportCanvas.height = height
    const exportCtx = exportCanvas.getContext('2d')
    if (!exportCtx) return

    // Fill everything opaque white (= keep)
    exportCtx.fillStyle = 'rgba(255,255,255,1)'
    exportCtx.fillRect(0, 0, width, height)

    // Where user painted on mask canvas (white/opaque pixels) → make transparent (= edit)
    const maskData = canvas.getContext('2d')!.getImageData(0, 0, width, height)
    const exportData = exportCtx.getImageData(0, 0, width, height)

    for (let i = 0; i < maskData.data.length; i += 4) {
      const alpha = maskData.data[i + 3]
      if (alpha > 10) {
        // This pixel was painted by user → should be transparent in export (edit area)
        exportData.data[i] = 0
        exportData.data[i + 1] = 0
        exportData.data[i + 2] = 0
        exportData.data[i + 3] = 0
      }
    }
    exportCtx.putImageData(exportData, 0, 0)
    onMaskChange(exportCanvas.toDataURL('image/png'))
  }, [width, height, onMaskChange])

  const startDrawing = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      e.preventDefault()
      const canvas = canvasRef.current
      if (!canvas) return
      const pos = getPos(e, canvas)
      lastPos.current = pos
      setIsDrawing(true)

      // Dot for single click/tap
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      drawStroke(ctx, pos, pos)
      setHasMask(true)
      exportMask()
    },
    [getPos, drawStroke, exportMask]
  )

  const continueDrawing = useCallback(
    (
      e:
        | React.MouseEvent<HTMLCanvasElement>
        | React.TouchEvent<HTMLCanvasElement>
    ) => {
      e.preventDefault()
      if (!isDrawing) return
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const pos = getPos(e, canvas)
      if (lastPos.current) {
        drawStroke(ctx, lastPos.current, pos)
      }
      lastPos.current = pos
      setHasMask(true)
      exportMask()
    },
    [isDrawing, getPos, drawStroke, exportMask]
  )

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
    lastPos.current = null
  }, [])

  const handleClear = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, width, height)
    setHasMask(false)
    onMaskChange(null)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1 rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          {(['brush', 'eraser'] as Tool[]).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                background: tool === t ? 'var(--color-primary)' : 'var(--color-surface)',
                color: tool === t ? '#fff' : 'var(--color-text-secondary)',
                border: 'none',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {t === 'brush' ? '🖌️ 브러시' : '🧹 지우개'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 flex-1">
          <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
            크기: {brushSize}px
          </span>
          <input
            type="range"
            min={8}
            max={80}
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            style={{ flex: 1, cursor: 'pointer', accentColor: 'var(--color-primary)' }}
          />
        </div>

        <button
          onClick={handleClear}
          disabled={!hasMask}
          style={{
            padding: '6px 14px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: hasMask ? 'pointer' : 'not-allowed',
            background: hasMask ? 'var(--color-error-surface, #fee2e2)' : 'var(--color-surface-raised)',
            color: hasMask ? 'var(--color-error, #ef4444)' : 'var(--color-text-tertiary)',
            border: '1px solid var(--color-border)',
            transition: 'all 0.15s',
          }}
        >
          초기화
        </button>
      </div>

      {/* Canvas container */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          borderRadius: '10px',
          overflow: 'hidden',
          border: '2px solid var(--color-border)',
          cursor: tool === 'brush' ? 'crosshair' : 'cell',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        {/* Background image */}
        <img
          src={imageUrl}
          alt="Edit base"
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            pointerEvents: 'none',
          }}
          draggable={false}
        />

        {/* Mask canvas overlay */}
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={continueDrawing}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={continueDrawing}
          onTouchEnd={stopDrawing}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            opacity: 0.55,
          }}
        />
      </div>

      <p style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', lineHeight: '1.5' }}>
        <strong>편집</strong>할 영역 위에 칠하세요. 칠하지 않은 부분은 그대로 유지됩니다.
      </p>
    </div>
  )
}
