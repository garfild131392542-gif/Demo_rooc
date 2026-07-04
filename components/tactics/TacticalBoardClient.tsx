'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { toJpeg } from 'html-to-image'
import { saveTacticalPlan, deleteTacticalPlan, uploadTacticalMap, uploadTacticalAudio, uploadTacticalVideo } from '@/app/actions/tactics'

// Standard RO GvG map configurations
const DEFAULT_MAPS = [
  { id: 'guild_league_old_main', name: 'กิลด์ลีกแบบเก่า (ห้องหลัก)', src: '/maps/Guild_league/ห้องหลัก.png', fallbackBg: 'bg-indigo-950/40', emoji: '🛡️' },
  { id: 'guild_league_old_sub', name: 'กิลด์ลีกแบบเก่า (ห้องรอง)', src: '/maps/Guild_league/ห้องรอง.png', fallbackBg: 'bg-purple-950/40', emoji: '⚔️' },
  { id: 'guild_league_new_forest', name: 'กิลด์ลีกแบบใหม่ (แผนที่ป่า)', src: '/maps/Guild_Leauge_ป่า.png', fallbackBg: 'bg-emerald-950/40', emoji: '🌳' },
  { id: 'guild_league_vigrid', name: 'กิลด์ลีกใหม่ (Vigrid Avenge)', src: '/maps/Vigrid_avenge.jpg', fallbackBg: 'bg-rose-950/40', emoji: '⚔️' },
]

// Default tokens matching the mockup
const DEFAULT_TOKENS = [
  { id: 1, name: 'Pirate', emoji: '🏴‍☠️', color: '#f43f5e', x: 250, y: 220, visible: true },
  { id: 2, name: 'IceWolf', emoji: '🐺', color: '#3b82f6', x: 620, y: 150, visible: true },
  { id: 3, name: 'Ghost', emoji: '👻', color: '#94a3b8', x: 380, y: 220, visible: true },
  { id: 4, name: 'Lion', emoji: '🦁', color: '#f59e0b', x: 320, y: 360, visible: true },
  { id: 5, name: 'GoldBug', emoji: '🐞', color: '#eab308', x: 450, y: 280, visible: true },
  { id: 6, name: 'Mushroom', emoji: '🍄', color: '#ef4444', x: 580, y: 230, visible: true },
  { id: 7, name: 'Cricket', emoji: '🦗', color: '#22c55e', x: 660, y: 380, visible: true },
  { id: 8, name: 'Poring', emoji: '🌸', color: '#ec4899', x: 720, y: 260, visible: true },
  { id: 9, name: 'Crown', emoji: '👑', color: '#a855f7', x: 200, y: 550, visible: true },
  { id: 10, name: 'Ninja', emoji: '🥷', color: '#14b8a6', x: 300, y: 550, visible: true },
  { id: 11, name: 'Phoenix', emoji: '🐦', color: '#f97316', x: 400, y: 550, visible: true },
  { id: 12, name: 'Dragon', emoji: '🐉', color: '#06b6d4', x: 500, y: 550, visible: true },
  { id: 13, name: 'Tiger', emoji: '🐯', color: '#84cc16', x: 600, y: 550, visible: true },
  { id: 14, name: 'Bear', emoji: '🐻', color: '#78350f', x: 700, y: 550, visible: true },
  { id: 15, name: 'Knight', emoji: '🛡️', color: '#6366f1', x: 800, y: 550, visible: true },
  { id: 16, name: 'Angel', emoji: '👼', color: '#d946ef', x: 900, y: 550, visible: true },
]

// Marker colors
const COLORS = [
  { value: '#ef4444', name: 'Red' },
  { value: '#eab308', name: 'Yellow' },
  { value: '#3b82f6', name: 'Blue' },
  { value: '#22c55e', name: 'Green' },
  { value: '#ffffff', name: 'White' },
  { value: '#000000', name: 'Black' },
]

interface TacticalBoardClientProps {
  initialProfiles: any[]
  isAdmin: boolean;
  initialPlans: any[]
}

export default function TacticalBoardClient({
  initialProfiles,
  isAdmin,
  initialPlans,
}: TacticalBoardClientProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  const [plans, setPlans] = useState<any[]>(initialPlans)
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [planName, setPlanName] = useState('')

  const [selectedMapId, setSelectedMapId] = useState('vale_of_clash')
  const [customMapUrl, setCustomMapUrl] = useState<string | null>(null)
  const [mapsList, setMapsList] = useState(DEFAULT_MAPS)
  const [mapError, setMapError] = useState(false)

  // Audio Recording States & Refs
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [savedAudioUrl, setSavedAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const localUrl = URL.createObjectURL(blob)
        setAudioUrl(localUrl)
        setSavedAudioUrl(null)

        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Error starting audio recording:', err)
      alert('ไม่สามารถเข้าถึงไมโครโฟนได้ กรุณาอนุญาตสิทธิ์การใช้ไมโครโฟน')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }
  }

  const deleteRecording = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    setSavedAudioUrl(null)
  }

  // Cleanup recording timer on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [])

  // Screen Video Recording States & Refs
  const [isVideoRecording, setIsVideoRecording] = useState(false)
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [savedVideoUrl, setSavedVideoUrl] = useState<string | null>(null)
  const [videoRecordingTime, setVideoRecordingTime] = useState(0)

  const videoMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const videoChunksRef = useRef<Blob[]>([])
  const videoTimerIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const videoStreamRef = useRef<MediaStream | null>(null)

  const startVideoRecording = async () => {
    try {
      // 1. Request Screen Capture with optimized video constraints (1080p max, ideal 30fps)
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: "browser",
          frameRate: { ideal: 30, max: 60 },
          width: { max: 1920 },
          height: { max: 1080 }
        },
        audio: true
      })

      // 2. Request Mic Capture
      let voiceStream: MediaStream | null = null
      try {
        voiceStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      } catch (e) {
        console.warn('Microphone access not granted. Recording screen only.', e)
      }

      const tracks = [...screenStream.getVideoTracks()]
      if (voiceStream) {
        tracks.push(...voiceStream.getAudioTracks())
      } else {
        tracks.push(...screenStream.getAudioTracks())
      }

      const combinedStream = new MediaStream(tracks)
      videoStreamRef.current = combinedStream
      videoChunksRef.current = []

      // Select lighter, hardware-accelerated video codec (H264/VP8) to avoid CPU-based drawing lag
      let selectedMimeType = 'video/webm;codecs=vp9,opus'
      if (MediaRecorder.isTypeSupported('video/webm;codecs=h264,opus')) {
        selectedMimeType = 'video/webm;codecs=h264,opus'
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        selectedMimeType = 'video/webm;codecs=vp8,opus'
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        selectedMimeType = 'video/webm'
      }

      const mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType: selectedMimeType
      })
      videoMediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          videoChunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(videoChunksRef.current, { type: 'video/webm' })
        setVideoBlob(blob)
        const localUrl = URL.createObjectURL(blob)
        setVideoUrl(localUrl)
        setSavedVideoUrl(null)

        combinedStream.getTracks().forEach(track => track.stop())
        screenStream.getTracks().forEach(track => track.stop())
        if (voiceStream) voiceStream.getTracks().forEach(track => track.stop())
      }

      screenStream.getVideoTracks()[0].onended = () => {
        stopVideoRecording()
      }

      mediaRecorder.start()
      setIsVideoRecording(true)
      setVideoRecordingTime(0)

      videoTimerIntervalRef.current = setInterval(() => {
        setVideoRecordingTime(prev => prev + 1)
      }, 1000)
    } catch (err) {
      console.error('Error starting screen recording:', err)
      alert('ไม่สามารถอัดวิดีโอหน้าจอได้ กรุณาตรวจสอบสิทธิ์การแชร์หน้าจอและไมโครโฟน')
    }
  }

  const stopVideoRecording = () => {
    if (videoMediaRecorderRef.current && videoMediaRecorderRef.current.state !== 'inactive') {
      videoMediaRecorderRef.current.stop()
    }
    setIsVideoRecording(false)
    if (videoTimerIntervalRef.current) {
      clearInterval(videoTimerIntervalRef.current)
    }
  }

  const deleteVideoRecording = () => {
    setVideoBlob(null)
    setVideoUrl(null)
    setSavedVideoUrl(null)
  }

  // Cleanup recording timers on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
      if (videoTimerIntervalRef.current) {
        clearInterval(videoTimerIntervalRef.current)
      }
    }
  }, [])

  // Eraser drag state
  const [isErasing, setIsErasing] = useState(false)
  const [mediaType, setMediaType] = useState<'audio' | 'video'>('audio')

  const [battleNotes, setBattleNotes] = useState('')
  const [toolMode, setToolMode] = useState<'select' | 'draw' | 'arrow' | 'text' | 'erase'>('select')
  const [strokeColor, setStrokeColor] = useState('#ef4444')
  const [strokeWidth, setStrokeWidth] = useState(4)

  // Collapse Panels state
  const [leftPanelOpen, setLeftPanelOpen] = useState(true)
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

  // Drawing states
  const [drawings, setDrawings] = useState<any[]>([])

  // DOM refs and points tracking for active drawing to prevent React lag during screen recording
  const activePointsRef = useRef<{ x: number, y: number }[]>([])
  const activePathRef = useRef<SVGPathElement | null>(null)
  const activeArrowRef = useRef<SVGLineElement | null>(null)

  // Text Tool states
  const [textInput, setTextInput] = useState({ x: 0, y: 0, visible: false, value: '' })

  // Tokens state
  const [tokens, setTokens] = useState(DEFAULT_TOKENS)
  const [draggedTokenId, setDraggedTokenId] = useState<number | null>(null)
  const dragOffset = useRef({ x: 0, y: 0 })

  const [activity, setActivity] = useState<'general' | 'guild_league' | 'emperium_overrun'>('general')
  const [guildLeagueRoom, setGuildLeagueRoom] = useState<'main' | 'sub'>('main')
  const [partyTeams, setPartyTeams] = useState<Record<number, 'defense' | 'offense' | 'runner'>>(() => {
    const defaults: Record<number, 'defense' | 'offense' | 'runner'> = {}
    for (let i = 1; i <= 16; i++) {
      if (i <= 6) defaults[i] = 'defense'
      else if (i <= 12) defaults[i] = 'offense'
      else defaults[i] = 'runner'
    }
    return defaults
  })

  // Automatically update map to default when switching Guild League rooms
  useEffect(() => {
    if (activity === 'guild_league') {
      if (guildLeagueRoom === 'sub') {
        setSelectedMapId('guild_league_old_sub')
      } else {
        setSelectedMapId('guild_league_old_main')
      }
    } else if (activity === 'emperium_overrun') {
      setSelectedMapId('custom')
    }
  }, [guildLeagueRoom, activity])

  const getPartiesForActivity = (act: 'general' | 'guild_league' | 'emperium_overrun') => {
    return Array.from({ length: 16 }, (_, i) => {
      const partyId = i + 1
      const defaultToken = DEFAULT_TOKENS.find(t => t.id === partyId)

      const partyProfiles = initialProfiles
        .filter((p: any) => {
          if (act === 'guild_league') {
            return p.party_id_guild_league === partyId
          } else if (act === 'emperium_overrun') {
            return p.party_id_emperium_overrun === partyId
          } else {
            return p.party_id === partyId
          }
        })
        .sort((a: any, b: any) => {
          const aIdx = act === 'guild_league'
            ? a.slot_index_guild_league
            : act === 'emperium_overrun'
              ? a.slot_index_emperium_overrun
              : a.slot_index
          const bIdx = act === 'guild_league'
            ? b.slot_index_guild_league
            : act === 'emperium_overrun'
              ? b.slot_index_emperium_overrun
              : b.slot_index
          return (aIdx ?? 99) - (bIdx ?? 99)
        })

      const slots = Array.from({ length: 5 }, (_, slotIdx) => {
        const profile = partyProfiles.find((p: any) => {
          const pIdx = act === 'guild_league'
            ? p.slot_index_guild_league
            : act === 'emperium_overrun'
              ? p.slot_index_emperium_overrun
              : p.slot_index
          return pIdx === slotIdx
        })
        return profile ? profile.display_name : ''
      })

      return {
        id: partyId,
        name: defaultToken?.name || `Party ${partyId}`,
        notes: '',
        slots,
      }
    })
  }

  // Parties roster state (left panel)
  const [parties, setParties] = useState<any[]>(() => {
    return getPartiesForActivity('general')
  })

  const [isPending, startTransition] = useTransition()
  const [imageExporting, setImageExporting] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  // Pre-fill active map URL
  const activeMap = mapsList.find(m => m.id === selectedMapId)
  const mapImageSrc = customMapUrl || activeMap?.src || '/maps/vale_of_clash.png'

  // Reset map load error when switching maps
  useEffect(() => {
    setMapError(false)
  }, [selectedMapId, customMapUrl])

  // Get coordinates (0 to 1000) relative to SVG viewBox
  const getCoordinates = (e: any) => {
    if (!svgRef.current) return null
    const rect = svgRef.current.getBoundingClientRect()

    let clientX = 0
    let clientY = 0

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const x = Math.round(((clientX - rect.left) / rect.width) * 1000)
    const y = Math.round(((clientY - rect.top) / rect.height) * 1000)
    return { x, y }
  }

  // Handle drawing events (using DOM refs to bypass React virtual DOM lag during CPU-heavy tasks)
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (toolMode === 'select' || toolMode === 'erase') return

    const coords = getCoordinates(e)
    if (!coords) return

    if (toolMode === 'draw') {
      activePointsRef.current = [coords]
      if (activePathRef.current) {
        activePathRef.current.setAttribute('d', `M ${coords.x} ${coords.y}`)
        activePathRef.current.setAttribute('stroke', strokeColor)
        activePathRef.current.setAttribute('stroke-width', strokeWidth.toString())
      }
    } else if (toolMode === 'arrow') {
      activePointsRef.current = [coords]
      if (activeArrowRef.current) {
        activeArrowRef.current.setAttribute('x1', coords.x.toString())
        activeArrowRef.current.setAttribute('y1', coords.y.toString())
        activeArrowRef.current.setAttribute('x2', coords.x.toString())
        activeArrowRef.current.setAttribute('y2', coords.y.toString())
        activeArrowRef.current.setAttribute('stroke', strokeColor)
        activeArrowRef.current.setAttribute('stroke-width', strokeWidth.toString())
        activeArrowRef.current.setAttribute('marker-end', `url(#arrow-${strokeColor.replace('#', '')})`)
      }
    } else if (toolMode === 'text') {
      setTextInput({
        x: coords.x,
        y: coords.y,
        visible: true,
        value: '',
      })
    }
  }

  const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (activePointsRef.current.length === 0) return
    const coords = getCoordinates(e)
    if (!coords) return

    if (toolMode === 'draw') {
      activePointsRef.current.push(coords)
      if (activePathRef.current) {
        const dString = activePointsRef.current.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
        activePathRef.current.setAttribute('d', dString)
      }
    } else if (toolMode === 'arrow') {
      if (activeArrowRef.current) {
        activeArrowRef.current.setAttribute('x2', coords.x.toString())
        activeArrowRef.current.setAttribute('y2', coords.y.toString())
      }
    }
  }

  const handleSvgMouseUp = () => {
    if (activePointsRef.current.length === 0) return

    if (toolMode === 'draw' && activePointsRef.current.length > 1) {
      const capturedPoints = [...activePointsRef.current]
      setDrawings(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'freehand',
          points: capturedPoints,
          color: strokeColor,
          width: strokeWidth,
        },
      ])
      if (activePathRef.current) {
        activePathRef.current.removeAttribute('d')
      }
    } else if (toolMode === 'arrow') {
      const start = activePointsRef.current[0]
      if (activeArrowRef.current) {
        const x2Attr = activeArrowRef.current.getAttribute('x2')
        const y2Attr = activeArrowRef.current.getAttribute('y2')
        if (x2Attr && y2Attr) {
          const end = { x: parseFloat(x2Attr), y: parseFloat(y2Attr) }
          const dist = Math.hypot(end.x - start.x, end.y - start.y)
          if (dist > 10) {
            setDrawings(prev => [
              ...prev,
              {
                id: Date.now().toString(),
                type: 'arrow',
                start,
                end,
                color: strokeColor,
                width: strokeWidth,
              },
            ])
          }
        }
        activeArrowRef.current.removeAttribute('marker-end')
        activeArrowRef.current.removeAttribute('x1')
        activeArrowRef.current.removeAttribute('y1')
        activeArrowRef.current.removeAttribute('x2')
        activeArrowRef.current.removeAttribute('y2')
      }
    }
    activePointsRef.current = []
  }

  // Eraser handler
  const handleElementClick = (elementId: string) => {
    if (toolMode !== 'erase') return
    setDrawings(prev => prev.filter(d => d.id !== elementId))
  }

  // Text label input save
  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (textInput.value.trim()) {
      setDrawings(prev => [
        ...prev,
        {
          id: Date.now().toString(),
          type: 'text',
          x: textInput.x,
          y: textInput.y,
          text: textInput.value,
          color: strokeColor,
        },
      ])
    }
    setTextInput({ x: 0, y: 0, visible: false, value: '' })
  }

  // Token dragging handlers
  const handleTokenStart = (e: any, tokenId: number) => {
    if (toolMode !== 'select') return
    e.preventDefault()

    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY

    const token = tokens.find(t => t.id === tokenId)
    if (!token) return

    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()

    const factorX = rect.width / 1000
    const factorY = rect.height / 1000

    const tokenPixelsX = token.x * factorX
    const tokenPixelsY = token.y * factorY

    const localX = clientX - rect.left
    const localY = clientY - rect.top

    dragOffset.current = {
      x: localX - tokenPixelsX,
      y: localY - tokenPixelsY,
    }

    setDraggedTokenId(tokenId)
  }

  useEffect(() => {
    const handleGlobalMove = (e: any) => {
      if (draggedTokenId === null || !svgRef.current) return

      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY

      const rect = svgRef.current.getBoundingClientRect()

      const localX = clientX - rect.left - dragOffset.current.x
      const localY = clientY - rect.top - dragOffset.current.y

      const x = Math.max(0, Math.min(1000, Math.round((localX / rect.width) * 1000)))
      const y = Math.max(0, Math.min(1000, Math.round((localY / rect.height) * 1000)))

      setTokens(prev =>
        prev.map(t => (t.id === draggedTokenId ? { ...t, x, y } : t))
      )
    }

    const handleGlobalUp = () => {
      if (draggedTokenId !== null) {
        setDraggedTokenId(null)
      }
    }

    if (draggedTokenId !== null) {
      window.addEventListener('mousemove', handleGlobalMove)
      window.addEventListener('mouseup', handleGlobalUp)
      window.addEventListener('touchmove', handleGlobalMove, { passive: false })
      window.addEventListener('touchend', handleGlobalUp)
    }

    return () => {
      window.removeEventListener('mousemove', handleGlobalMove)
      window.removeEventListener('mouseup', handleGlobalUp)
      window.removeEventListener('touchmove', handleGlobalMove)
      window.removeEventListener('touchend', handleGlobalUp)
    }
  }, [draggedTokenId])

  // Custom Map Image Uploader
  const handleMapUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const file = e.target.files[0]

    const formData = new FormData()
    formData.append('file', file)

    startTransition(async () => {
      const result = await uploadTacticalMap(formData)
      if (result.success && result.url) {
        setCustomMapUrl(result.url)
        setSelectedMapId('custom')

        if (!mapsList.find(m => m.id === 'custom')) {
          setMapsList(prev => [
            ...prev,
            { id: 'custom', name: 'แผนที่กิลด์ที่อัปโหลด', src: result.url!, fallbackBg: 'bg-slate-900', emoji: '🖼️' },
          ])
        } else {
          setMapsList(prev =>
            prev.map(m => (m.id === 'custom' ? { ...m, src: result.url! } : m))
          )
        }
        alert('อัปโหลดแผนที่กิลด์สำเร็จ!')
      } else {
        alert(`เกิดข้อผิดพลาดในการอัปโหลด: ${result.error}`)
      }
    })
  }

  // Roster input handlers
  const handlePartyNameChange = (partyId: number, value: string) => {
    setParties(prev =>
      prev.map(p => (p.id === partyId ? { ...p, name: value } : p))
    )
    setTokens(prev =>
      prev.map(t => (t.id === partyId ? { ...t, name: value } : t))
    )
  }

  const handlePartyEmojiChange = (partyId: number, value: string) => {
    setTokens(prev =>
      prev.map(t => (t.id === partyId ? { ...t, emoji: value } : t))
    )
  }

  const handlePartyColorChange = (partyId: number, value: string) => {
    setTokens(prev =>
      prev.map(t => (t.id === partyId ? { ...t, color: value } : t))
    )
  }

  const handleMemberSlotChange = (partyId: number, slotIdx: number, value: string) => {
    setParties(prev =>
      prev.map(p => {
        if (p.id === partyId) {
          const newSlots = [...p.slots]
          newSlots[slotIdx] = value
          return { ...p, slots: newSlots }
        }
        return p
      })
    )
  }

  const handlePartyNoteChange = (partyId: number, value: string) => {
    setParties(prev =>
      prev.map(p => (p.id === partyId ? { ...p, notes: value } : p))
    )
  }

  // Toggle token visibility
  const toggleTokenVisibility = (tokenId: number) => {
    setTokens(prev =>
      prev.map(t => (t.id === tokenId ? { ...t, visible: t.visible === false ? true : false } : t))
    )
  }

  const isTokenVisible = (tokenId: number) => {
    const token = tokens.find(t => t.id === tokenId)
    return token?.visible !== false
  }

  // Save tactical plan
  const handleSavePlan = async () => {
    if (!planName.trim()) {
      alert('กรุณากรอกชื่อแผนการรบ')
      return
    }

    startTransition(async () => {
      let finalAudioUrl = savedAudioUrl
      let finalVideoUrl = savedVideoUrl

      // If we have a new recording to upload
      if (audioBlob) {
        const formData = new FormData()
        formData.append('file', audioBlob, 'voice-plan.webm')
        const uploadRes = await uploadTacticalAudio(formData)
        if (uploadRes.success && uploadRes.url) {
          finalAudioUrl = uploadRes.url
          setSavedAudioUrl(uploadRes.url)
          setAudioBlob(null)
        } else {
          alert(`อัปโหลดไฟล์เสียงอธิบายล้มเหลว: ${uploadRes.error}. จะบันทึกแผนรบโดยไม่มีเสียงอธิบาย`)
        }
      }

      // If we have a new video recording to upload
      if (videoBlob) {
        const formData = new FormData()
        formData.append('file', videoBlob, 'screen-plan.webm')
        const uploadRes = await uploadTacticalVideo(formData)
        if (uploadRes.success && uploadRes.url) {
          finalVideoUrl = uploadRes.url
          setSavedVideoUrl(uploadRes.url)
          setVideoBlob(null)
        } else {
          alert(`อัปโหลดวิดีโอหน้าจอล้มเหลว: ${uploadRes.error}. จะบันทึกแผนรบโดยไม่มีวิดีโออธิบาย`)
        }
      }

      const res = await saveTacticalPlan(
        selectedPlanId,
        planName,
        selectedMapId === 'custom' ? (customMapUrl || 'custom') : selectedMapId,
        battleNotes,
        tokens,
        drawings,
        {
          parties,
          activity,
          partyTeams,
          guildLeagueRoom,
          audio_url: finalAudioUrl,
          video_url: finalVideoUrl
        }
      )

      if (res.success && res.plan) {
        alert('บันทึกแผนการรบสำเร็จ!')
        if (!selectedPlanId) {
          setPlans(prev => [res.plan, ...prev])
          setSelectedPlanId(res.plan.id)
        } else {
          setPlans(prev => prev.map(p => (p.id === res.plan.id ? res.plan : p)))
        }
      } else {
        alert(`เกิดข้อผิดพลาดในการบันทึก: ${res.error}`)
      }
    })
  }

  // Load tactical plan
  const handleLoadPlan = (plan: any) => {
    setSelectedPlanId(plan.id)
    setPlanName(plan.plan_name)
    setBattleNotes(plan.battle_notes || '')
    setTokens(plan.token_positions || DEFAULT_TOKENS)
    setDrawings(plan.drawings || [])

    if (plan.parties_data) {
      if (Array.isArray(plan.parties_data)) {
        setParties(plan.parties_data)
        setActivity('general')
        setSavedAudioUrl(null)
        setAudioUrl(null)
        setAudioBlob(null)
        setSavedVideoUrl(null)
        setVideoUrl(null)
        setVideoBlob(null)
      } else {
        setParties(plan.parties_data.parties || [])
        setActivity(plan.parties_data.activity || 'general')
        if (plan.parties_data.partyTeams) {
          setPartyTeams(plan.parties_data.partyTeams)
        }
        if (plan.parties_data.guildLeagueRoom) {
          setGuildLeagueRoom(plan.parties_data.guildLeagueRoom)
        }
        if (plan.parties_data.audio_url || plan.parties_data.audioUrl) {
          setSavedAudioUrl(plan.parties_data.audio_url || plan.parties_data.audioUrl)
          setAudioUrl(null)
          setAudioBlob(null)
        } else {
          setSavedAudioUrl(null)
          setAudioUrl(null)
          setAudioBlob(null)
        }
        if (plan.parties_data.video_url || plan.parties_data.videoUrl) {
          setSavedVideoUrl(plan.parties_data.video_url || plan.parties_data.videoUrl)
          setVideoUrl(null)
          setVideoBlob(null)
        } else {
          setSavedVideoUrl(null)
          setVideoUrl(null)
          setVideoBlob(null)
        }
      }
    } else {
      setParties([])
      setActivity('general')
      setSavedAudioUrl(null)
      setAudioUrl(null)
      setAudioBlob(null)
      setSavedVideoUrl(null)
      setVideoUrl(null)
      setVideoBlob(null)
    }

    if (plan.map_name.startsWith('http') || plan.map_name === 'custom') {
      setCustomMapUrl(plan.map_name)
      setSelectedMapId('custom')
      if (!mapsList.find(m => m.id === 'custom')) {
        setMapsList(prev => [
          ...prev,
          { id: 'custom', name: 'แผนที่กิลด์ที่อัปโหลด', src: plan.map_name, fallbackBg: 'bg-slate-900', emoji: '🖼️' },
        ])
      }
    } else {
      setSelectedMapId(plan.map_name)
      setCustomMapUrl(null)
    }
  }

  // Delete tactical plan
  const handleDeletePlan = async (planId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบแผนการรบนี้?')) return

    startTransition(async () => {
      const res = await deleteTacticalPlan(planId)
      if (res.success) {
        setPlans(prev => prev.filter(p => p.id !== planId))
        if (selectedPlanId === planId) {
          setSelectedPlanId(null)
          setPlanName('')
          setBattleNotes('')
          setDrawings([])
          setTokens(DEFAULT_TOKENS)
          setSavedAudioUrl(null)
          setAudioUrl(null)
          setAudioBlob(null)
          setSavedVideoUrl(null)
          setVideoUrl(null)
          setVideoBlob(null)
        }
        alert('ลบแผนการรบสำเร็จ!')
      } else {
        alert(`เกิดข้อผิดพลาดในการลบ: ${res.error}`)
      }
    })
  }

  // Export board to JPEG
  const handleExportImage = async () => {
    if (!exportRef.current) return
    setImageExporting(true)
    setImageError(null)

    try {
      const dataUrl = await toJpeg(exportRef.current, {
        quality: 0.95,
        backgroundColor: '#0f172a',
        pixelRatio: 2,
      })

      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${planName || 'gvg-tactical-plan'}.jpg`
      link.click()
    } catch (err: any) {
      console.error('Export Tactical Board Error:', err)
      setImageError('เกิดข้อผิดพลาดในการแปลงไฟล์รูปภาพ กรุณาลองอีกครั้ง')
    } finally {
      setImageExporting(false)
    }
  }

  const handleResetPositions = () => {
    setTokens(prev => prev.map(t => {
      const defaultT = DEFAULT_TOKENS.find(dt => dt.id === t.id)
      return {
        ...t,
        x: defaultT?.x ?? t.x,
        y: defaultT?.y ?? t.y,
      }
    }))
  }

  const renderPartyCard = (party: any) => {
    const currentToken = tokens.find(t => t.id === party.id)
    return (
      <div key={party.id} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl space-y-2 hover:border-slate-350 dark:hover:border-slate-700 transition-all shadow-xs">

        {/* Party Header & Name Input & Visibility Toggle */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 flex-grow min-w-0">
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="text"
                value={currentToken?.emoji || ''}
                onChange={(e) => handlePartyEmojiChange(party.id, e.target.value)}
                style={{ backgroundColor: currentToken?.color || '#38bdf8' }}
                className="w-7 h-7 text-center rounded-lg text-xs font-bold text-white focus:outline-none shrink-0 shadow-sm cursor-text border border-white/20 transition-all focus:ring-1 focus:ring-white"
                maxLength={2}
                title="เปลี่ยนอิโมจิหรือตัวอักษรย่อ"
              />
              <div className="relative w-4 h-4 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700 shadow-xs">
                <input
                  type="color"
                  value={currentToken?.color || '#38bdf8'}
                  onChange={(e) => handlePartyColorChange(party.id, e.target.value)}
                  className="absolute inset-[-4px] w-[200%] h-[200%] cursor-pointer border-none p-0"
                  title="เปลี่ยนสีตี้"
                />
              </div>
            </div>
            <div className="flex flex-col min-w-0 flex-grow">
              <input
                type="text"
                value={party.name}
                onChange={(e) => handlePartyNameChange(party.id, e.target.value)}
                placeholder={`Party ${party.id}`}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none border-b border-transparent hover:border-slate-350 dark:hover:border-slate-700 focus:border-indigo-500 w-full pb-0.5 truncate"
              />
              {activity === 'emperium_overrun' && isAdmin && (
                <select
                  value={partyTeams[party.id] || 'defense'}
                  onChange={(e) => setPartyTeams(prev => ({ ...prev, [party.id]: e.target.value as any }))}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-[9px] font-bold px-1 py-0.5 text-slate-600 dark:text-slate-400 focus:outline-none cursor-pointer mt-0.5 self-start"
                >
                  <option value="defense">🏰 กันบ้าน</option>
                  <option value="offense">🔥 ทีมบุก</option>
                  <option value="runner">⚡ วิ่งบ้าน</option>
                </select>
              )}
            </div>
          </div>

          {/* Token visibility text toggle */}
          <button
            onClick={() => toggleTokenVisibility(party.id)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer border shrink-0 ${isTokenVisible(party.id)
              ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400'
              : 'bg-slate-100 border-slate-200 dark:bg-slate-900 dark:border-slate-800 text-slate-400 dark:text-slate-550'
              }`}
            title={isTokenVisible(party.id) ? 'ซ่อนโทเค็นจากแผนที่' : 'แสดงโทเค็นบนแผนที่'}
          >
            {isTokenVisible(party.id) ? 'แสดง' : 'ซ่อน'}
          </button>
        </div>

        {/* Party Member Slot Inputs */}
        <div className="space-y-1.5 pl-8">
          {party.slots.map((name: string, slotIdx: number) => (
            <div key={slotIdx} className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono w-2.5">{slotIdx + 1}.</span>
              <input
                type="text"
                value={name}
                onChange={(e) => handleMemberSlotChange(party.id, slotIdx, e.target.value)}
                placeholder="ชื่อตัวละคร..."
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-xs px-2 py-1 rounded w-full focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-300"
              />
            </div>
          ))}
        </div>

        {/* Mini notes for the party */}
        <div className="pl-8 pt-0.5">
          <textarea
            value={party.notes}
            onChange={(e) => handlePartyNoteChange(party.id, e.target.value)}
            placeholder="เป้าหมาย/หมายเหตุ..."
            rows={2}
            className="w-full bg-slate-55/60 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 text-[10px] p-1.5 rounded focus:outline-none focus:border-indigo-500 resize-none text-slate-650 dark:text-slate-400"
          />
        </div>
      </div>
    )
  }

  return (
    <div
      className="relative w-full text-slate-800 dark:text-slate-100 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex shadow-sm"
      style={{ height: '820px' }}
    >

      {/* ─── 👥 LEFT PANEL: Collapsible internally scrollable Parties Config ─── */}
      <div
        className={`shrink-0 w-80 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col transition-all duration-300 ${leftPanelOpen ? 'ml-0 opacity-100' : '-ml-80 opacity-0 pointer-events-none'
          }`}
        style={{ height: '100%' }}
      >
        {/* Fixed Panel Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
          <h2 className="text-sm font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
            👥 จัดปาร์ตี้บอร์ดรบ (1-16)
          </h2>
          <button
            onClick={() => setLeftPanelOpen(false)}
            className="text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300 text-xs cursor-pointer p-0.5"
            title="ซ่อนพาเนล"
          >
            ❌
          </button>
        </div>

        {/* Activity Selector */}
        <div className="mt-3 shrink-0 space-y-3">
          <div>
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 block mb-1 uppercase tracking-wider font-mono">🎯 กิจกรรม (Activity)</label>
            <select
              value={activity}
              onChange={(e) => {
                const newAct = e.target.value as any
                setActivity(newAct)
                setParties(getPartiesForActivity(newAct))
              }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs p-2 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer shadow-xxs"
            >
              <option value="general">📂 ทั่วไป (1-16 ปาร์ตี้)</option>
              <option value="guild_league">🏆 Guild League (กิลด์ลีก)</option>
              <option value="emperium_overrun">🏰 Emperium Overrun</option>
            </select>
          </div>

          {activity === 'guild_league' && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 block mb-1 uppercase tracking-wider font-mono">🏢 เลือกห้องแข่งขัน (Room)</label>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl flex gap-1 shadow-xxs">
                <button
                  onClick={() => setGuildLeagueRoom('main')}
                  className={`flex-1 py-1.5 rounded-lg text-xxs font-bold transition-all cursor-pointer text-center ${guildLeagueRoom === 'main'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-705 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                  🛡️ ห้องหลัก
                </button>
                <button
                  onClick={() => setGuildLeagueRoom('sub')}
                  className={`flex-1 py-1.5 rounded-lg text-xxs font-bold transition-all cursor-pointer text-center ${guildLeagueRoom === 'sub'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-705 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                  ⚔️ ห้องรอง
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Internally Scrollable Roster list */}
        <div className="flex-grow overflow-y-auto mt-4 pr-1 space-y-4">
          {activity === 'general' && parties.map(party => renderPartyCard(party))}

          {activity === 'guild_league' && (
            <div className="space-y-6">
              {guildLeagueRoom === 'main' ? (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 border-b border-indigo-150 dark:border-indigo-900/50 pb-1 flex items-center gap-1.5">
                    <span>🛡️</span> ทีมหลัก (Main) - 40 คน
                  </div>
                  {parties.filter(p => p.id <= 8).map(party => renderPartyCard(party))}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-purple-600 dark:text-purple-400 border-b border-purple-150 dark:border-purple-900/50 pb-1 flex items-center gap-1.5">
                    <span>⚔️</span> ทีมรอง (Sub) - 40 คน
                  </div>
                  {parties.filter(p => p.id > 8).map(party => renderPartyCard(party))}
                </div>
              )}
            </div>
          )}

          {activity === 'emperium_overrun' && (
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="text-xs font-bold text-blue-600 dark:text-blue-400 border-b border-blue-150 dark:border-blue-900/50 pb-1 flex items-center gap-1.5">
                  <span>🏰</span> ทีมป้องกันบ้าน (Defense)
                </div>
                {parties.filter(p => partyTeams[p.id] === 'defense').length === 0 ? (
                  <p className="text-[10px] text-slate-500 text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">ไม่มีปาร์ตี้ในทีมนี้</p>
                ) : (
                  parties.filter(p => partyTeams[p.id] === 'defense').map(party => renderPartyCard(party))
                )}
              </div>
              <div className="space-y-3">
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400 border-b border-rose-150 dark:border-rose-900/50 pb-1 flex items-center gap-1.5">
                  <span>🔥</span> ทีมบุก (Offense)
                </div>
                {parties.filter(p => partyTeams[p.id] === 'offense').length === 0 ? (
                  <p className="text-[10px] text-slate-500 text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">ไม่มีปาร์ตี้ในทีมนี้</p>
                ) : (
                  parties.filter(p => partyTeams[p.id] === 'offense').map(party => renderPartyCard(party))
                )}
              </div>
              <div className="space-y-3">
                <div className="text-xs font-bold text-amber-600 dark:text-amber-450 border-b border-amber-155 dark:border-amber-900/50 pb-1 flex items-center gap-1.5">
                  <span>⚡</span> ทีมวิ่งบ้าน (Runner)
                </div>
                {parties.filter(p => partyTeams[p.id] === 'runner').length === 0 ? (
                  <p className="text-[10px] text-slate-500 text-center py-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">ไม่มีปาร์ตี้ในทีมนี้</p>
                ) : (
                  parties.filter(p => partyTeams[p.id] === 'runner').map(party => renderPartyCard(party))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── 🛠️ CENTRAL AREA: Full-Width Full-Height Edge-to-Edge Canvas ─── */}
      <div
        className="flex-1 h-full relative min-w-0 bg-slate-950 overflow-hidden"
        style={{ height: '100%' }}
      >

        {/* Floating Sidebar Open buttons (when collapsed) */}
        {!leftPanelOpen && (
          <button
            onClick={() => setLeftPanelOpen(true)}
            className="absolute left-4 top-4 z-30 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer text-slate-850 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            👥 แสดงปาร์ตี้
          </button>
        )}

        {!rightPanelOpen && (
          <button
            onClick={() => setRightPanelOpen(true)}
            className="absolute right-4 top-4 z-30 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-850 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer text-slate-850 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            ⚙️ การตั้งค่าแผนรบ
          </button>
        )}

        {/* 🛠️ Floating Toolbar: Positioned absolute inside the canvas */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-800 px-4 py-2 rounded-full shadow-lg transition-all">
          {/* Tool selector buttons */}
          <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2">
            <button
              onClick={() => setToolMode('select')}
              title="ย้ายตำแหน่งทีม"
              className={`w-7 h-7 rounded-full text-sm flex items-center justify-center transition-all cursor-pointer ${toolMode === 'select' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              🖐️
            </button>
            <button
              onClick={() => setToolMode('draw')}
              title="วาดเส้นอิสระ"
              className={`w-7 h-7 rounded-full text-sm flex items-center justify-center transition-all cursor-pointer ${toolMode === 'draw' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              ✏️
            </button>
            <button
              onClick={() => setToolMode('arrow')}
              title="ลากลูกศรชี้นำ"
              className={`w-7 h-7 rounded-full text-sm flex items-center justify-center transition-all cursor-pointer ${toolMode === 'arrow' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              ↗️
            </button>
            <button
              onClick={() => setToolMode('text')}
              title="เขียนป้ายข้อความ"
              className={`w-7 h-7 rounded-full text-sm flex items-center justify-center transition-all cursor-pointer ${toolMode === 'text' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              🇹
            </button>
            <button
              onClick={() => setToolMode('erase')}
              title="ยางลบลบวัตถุ"
              className={`w-7 h-7 rounded-full text-sm flex items-center justify-center transition-all cursor-pointer ${toolMode === 'erase' ? 'bg-rose-600 text-white shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}
            >
              🧹
            </button>
          </div>

          {/* Color dots */}
          {toolMode !== 'select' && toolMode !== 'erase' && (
            <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-800 pr-2">
              {COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => setStrokeColor(color.value)}
                  style={{ backgroundColor: color.value }}
                  className={`w-4 h-4 rounded-full border border-slate-900 transition-all cursor-pointer ${strokeColor === color.value ? 'scale-125 ring-2 ring-indigo-500' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                />
              ))}
            </div>
          )}

          {/* Stroke thickness slider */}
          {toolMode !== 'select' && toolMode !== 'erase' && toolMode !== 'text' && (
            <div className="flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-800 pr-2">
              <input
                type="range"
                min="2"
                max="14"
                value={strokeWidth}
                onChange={(e) => setStrokeWidth(Number(e.target.value))}
                className="w-12 accent-indigo-500 h-0.5 bg-slate-800 rounded appearance-none cursor-pointer"
              />
            </div>
          )}

          {/* Clear button */}
          <button
            onClick={() => setDrawings([])}
            className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 cursor-pointer"
            title="ล้างเส้นวาดทั้งหมด"
          >
            🗑️
          </button>
        </div>

        {/* ─── CAPTURED ELEMENT (Edge-to-edge layout filling entire middle space) ─── */}
        <div
          ref={exportRef}
          className="w-full h-full relative overflow-hidden bg-slate-950 flex flex-col justify-between"
        >

          {/* Interactive Workspace Container (Full width and height of parent, no aspect ratio constraints) */}
          <div className="relative w-full h-full rounded-none bg-slate-950 overflow-hidden shadow-none">

            {/* 1. Grid Blueprint Background (beautiful neon grid) */}
            <div className="absolute inset-0 bg-[#080d1a] z-0">
              <svg className="absolute inset-0 w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" className="text-slate-800/60 dark:text-slate-900/60" strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* 2. Map Image Background (Stretched dynamically fitting viewport coordinate 1000x1000) */}
            {!mapError && (
              <img
                src={mapImageSrc}
                alt={selectedMapId}
                onError={() => setMapError(true)}
                className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none opacity-95 z-0"
              />
            )}

            {/* 3. Blueprint fallback text when map image fails to load */}
            {mapError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none z-0">
                <span className="text-5xl animate-pulse">{activeMap?.emoji || '🗺️'}</span>
                <span className="text-sm font-bold text-slate-400 mt-2">{activeMap?.name || 'ไม่มีภาพแผนที่'}</span>
                <span className="text-[10px] text-slate-500 max-w-xs text-center mt-1">กรุณาเพิ่มรูปภาพแผนที่ในโฟลเดอร์ public/maps</span>
              </div>
            )}

            {/* 4. Drawing and SVG overlay */}
            <svg
              ref={svgRef}
              viewBox="0 0 1000 1000"
              preserveAspectRatio="none"
              onMouseDown={(e) => { if (toolMode === 'erase') setIsErasing(true); handleSvgMouseDown(e); }}
              onMouseMove={handleSvgMouseMove}
              onMouseUp={() => { setIsErasing(false); handleSvgMouseUp(); }}
              onMouseLeave={() => { setIsErasing(false); handleSvgMouseUp(); }}
              onTouchStart={(e) => { if (toolMode === 'erase') setIsErasing(true); handleSvgMouseDown(e); }}
              onTouchMove={handleSvgMouseMove}
              onTouchEnd={() => { setIsErasing(false); handleSvgMouseUp(); }}
              className={`absolute inset-0 w-full h-full select-none z-10 ${toolMode === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
            >
              {/* Dynamic arrowhead definitions per color */}
              <defs>
                {COLORS.map(color => (
                  <marker
                    key={color.value}
                    id={`arrow-${color.value.replace('#', '')}`}
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="5"
                    markerHeight="5"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={color.value} />
                  </marker>
                ))}
              </defs>

              {/* Render Saved Drawings */}
              {drawings.map(d => {
                if (d.type === 'freehand') {
                  const dString = d.points
                    .map((p: any, i: number) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
                    .join(' ')
                  return (
                    <g
                      key={d.id}
                      onClick={() => handleElementClick(d.id)}
                      onMouseEnter={() => { if (isErasing) handleElementClick(d.id); }}
                      onMouseMove={() => { if (isErasing) handleElementClick(d.id); }}
                      className={toolMode === 'erase' ? 'group cursor-pointer' : ''}
                    >
                      {/* Hitbox path */}
                      {toolMode === 'erase' && (
                        <path
                          d={dString}
                          stroke="transparent"
                          strokeWidth={Math.max(24, (d.width || 0) + 16)}
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                      <path
                        d={dString}
                        stroke={d.color}
                        strokeWidth={d.width}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={toolMode === 'erase' ? 'group-hover:stroke-rose-600' : ''}
                      />
                    </g>
                  )
                } else if (d.type === 'arrow') {
                  const colorKey = d.color.replace('#', '')
                  return (
                    <g
                      key={d.id}
                      onClick={() => handleElementClick(d.id)}
                      onMouseEnter={() => { if (isErasing) handleElementClick(d.id); }}
                      onMouseMove={() => { if (isErasing) handleElementClick(d.id); }}
                      className={toolMode === 'erase' ? 'group cursor-pointer' : ''}
                    >
                      {/* Hitbox line */}
                      {toolMode === 'erase' && (
                        <line
                          x1={d.start.x}
                          y1={d.start.y}
                          x2={d.end.x}
                          y2={d.end.y}
                          stroke="transparent"
                          strokeWidth={Math.max(24, (d.width || 0) + 16)}
                          strokeLinecap="round"
                        />
                      )}
                      <line
                        x1={d.start.x}
                        y1={d.start.y}
                        x2={d.end.x}
                        y2={d.end.y}
                        stroke={d.color}
                        strokeWidth={d.width}
                        strokeLinecap="round"
                        markerEnd={`url(#arrow-${colorKey})`}
                        className={toolMode === 'erase' ? 'group-hover:stroke-rose-600' : ''}
                      />
                    </g>
                  )
                } else if (d.type === 'text') {
                  return (
                    <g
                      key={d.id}
                      onClick={() => handleElementClick(d.id)}
                      onMouseEnter={() => { if (isErasing) handleElementClick(d.id); }}
                      onMouseMove={() => { if (isErasing) handleElementClick(d.id); }}
                      className={toolMode === 'erase' ? 'group cursor-pointer' : ''}
                    >
                      {/* Hitbox rect */}
                      {toolMode === 'erase' && (
                        <rect
                          x={d.x - 60}
                          y={d.y - 20}
                          width={120}
                          height={40}
                          fill="transparent"
                        />
                      )}
                      <text
                        x={d.x}
                        y={d.y}
                        fill={d.color}
                        fontSize={26}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontWeight="bold"
                        className={`select-none font-sans ${toolMode === 'erase' ? 'group-hover:fill-rose-600' : ''}`}
                      >
                        {d.text}
                      </text>
                    </g>
                  )
                }
                return null
              })}

              {/* Render Current Drawing Previews (Managed via DOM refs for latency-free dragging) */}
              <path
                ref={activePathRef}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <line
                ref={activeArrowRef}
                strokeLinecap="round"
              />
            </svg>

            {/* 5. Interactive Floating Text Input Tool */}
            {textInput.visible && (
              <form
                onSubmit={handleTextSubmit}
                style={{
                  position: 'absolute',
                  left: `${textInput.x / 10}%`,
                  top: `${textInput.y / 10}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-1.5 rounded-lg flex items-center shadow-lg"
              >
                <input
                  type="text"
                  autoFocus
                  value={textInput.value}
                  onChange={(e) => setTextInput(prev => ({ ...prev, value: e.target.value }))}
                  placeholder="พิมพ์ข้อความ..."
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs px-2 py-1 rounded focus:outline-none w-28 text-slate-800 dark:text-slate-100"
                />
                <button type="submit" className="ml-1 bg-indigo-600 px-2 py-1 text-[10px] font-bold rounded hover:bg-indigo-500 text-white cursor-pointer">
                  ตกลง
                </button>
              </form>
            )}

            {/* 6. Draggable Tokens (Filtered by Visibility state, with hover tooltip) */}
            {tokens.filter(t => {
              if (t.visible === false) return false;
              if (activity === 'guild_league') {
                if (guildLeagueRoom === 'main') return t.id <= 8;
                if (guildLeagueRoom === 'sub') return t.id > 8;
              }
              return true;
            }).map(token => {
              const leftPercent = token.x / 10
              const topPercent = token.y / 10
              const isDragged = token.id === draggedTokenId

              return (
                <div
                  key={token.id}
                  onMouseDown={(e) => handleTokenStart(e, token.id)}
                  onTouchStart={(e) => handleTokenStart(e, token.id)}
                  style={{
                    position: 'absolute',
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    transform: 'translate(-50%, -50%)',
                    touchAction: 'none',
                  }}
                  className={`z-20 select-none flex flex-col items-center group/token ${toolMode === 'select' ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'}`}
                >
                  {/* Glassmorphic Tooltip (Visible on Hover) */}
                  <div className="absolute bottom-full mb-2 opacity-0 group-hover/token:opacity-100 transition-opacity duration-200 pointer-events-none bg-slate-950/95 dark:bg-slate-900/95 text-white border border-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap z-50">
                    P{token.id}: {token.name}
                  </div>

                  <div
                    style={{ borderColor: token.color, boxShadow: `0 0 12px ${token.color}80` }}
                    className={`w-10 h-10 rounded-full border-3 bg-white dark:bg-slate-900 flex items-center justify-center transition-all shadow-md relative ${isDragged ? 'scale-125 shadow-lg' : 'hover:scale-110 shadow-sm'}`}
                  >
                    <span className="text-xl">{token.emoji}</span>
                    <span
                      style={{ backgroundColor: token.color }}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-white flex items-center justify-center border border-white dark:border-slate-900"
                    >
                      {token.id}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

        </div>
      </div>

      {/* ─── ⚙️ RIGHT PANEL: Collapsible internally scrollable Configuration ─── */}
      <div
        className={`shrink-0 w-80 bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 p-4 flex flex-col transition-all duration-300 ${rightPanelOpen ? 'mr-0 opacity-100' : '-mr-80 opacity-0 pointer-events-none'
          }`}
        style={{ height: '100%' }}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 shrink-0">
          <h2 className="text-sm font-bold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
            ⚙️ ตั้งค่ายุทธวิธี & บันทึก
          </h2>
          <button
            onClick={() => setRightPanelOpen(false)}
            className="text-slate-400 hover:text-slate-650 dark:text-slate-500 dark:hover:text-slate-300 text-xs cursor-pointer p-0.5"
            title="ซ่อนพาเนล"
          >
            ❌
          </button>
        </div>

        {/* Scrollable contents */}
        <div className="flex-grow overflow-y-auto mt-4 pr-1 space-y-4">

          {/* Battle notes */}
          <div className="space-y-1.5">
            <label className="text-xxs font-bold text-slate-450 dark:text-slate-405 block uppercase tracking-wider">🗒️ รายละเอียดของแผน</label>
            <textarea
              value={battleNotes}
              onChange={(e) => setBattleNotes(e.target.value)}
              placeholder="อธิบายแผนรบ..."
              rows={4}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs p-2.5 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 resize-none shadow-xxs"
            />
          </div>

          {/* Map selection */}
          <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-3">
            <label className="text-xxs font-bold text-slate-450 dark:text-slate-405 block uppercase tracking-wider">🗺️ เลือกแผนที่สนามรบ</label>
            <select
              value={selectedMapId}
              onChange={(e) => {
                setSelectedMapId(e.target.value)
                if (e.target.value !== 'custom') setCustomMapUrl(null)
              }}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs p-2.5 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 cursor-pointer shadow-xxs font-semibold"
            >
              <optgroup label="🏆 กิลด์ลีก (Guild League)" className="text-indigo-600 dark:text-indigo-400 font-bold bg-white dark:bg-slate-900">
                {mapsList.filter(m => m.id.startsWith('guild_league_')).map(map => (
                  <option key={map.id} value={map.id} className="text-slate-800 dark:text-slate-200 font-normal">
                    {map.emoji} {map.name}
                  </option>
                ))}
              </optgroup>
              {mapsList.some(m => !m.id.startsWith('guild_league_') && m.id !== 'custom') && (
                <optgroup label="🏰 ยึดปราสาท (Emperium Overrun)" className="text-orange-600 dark:text-orange-400 font-bold bg-white dark:bg-slate-900">
                  {mapsList.filter(m => !m.id.startsWith('guild_league_') && m.id !== 'custom').map(map => (
                    <option key={map.id} value={map.id} className="text-slate-800 dark:text-slate-200 font-normal">
                      {map.emoji} {map.name}
                    </option>
                  ))}
                </optgroup>
              )}
              {mapsList.some(m => m.id === 'custom') && (
                <optgroup label="🖼️ อัปโหลดเอง (Custom Map)" className="text-slate-500 font-bold bg-white dark:bg-slate-900">
                  {mapsList.filter(m => m.id === 'custom').map(map => (
                    <option key={map.id} value={map.id} className="text-slate-800 dark:text-slate-200 font-normal">
                      {map.emoji} {map.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {/* Map Uploader (Admin only) */}
            {isAdmin && (
              <div className="pt-1">
                <label className="cursor-pointer text-xxs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center justify-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 p-2 rounded-xl transition-all shadow-xxs">
                  📤 อัปโหลดแผนที่
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleMapUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Admin reset controls */}
          {isAdmin && (
            <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-3">

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleResetPositions}
                  className="cursor-pointer text-xxs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 p-2 rounded-xl text-slate-700 dark:text-slate-300 font-bold transition-all text-center shadow-xxs"
                >
                  รีเซ็ตตำแหน่ง
                </button>
                <button
                  onClick={() => setDrawings([])}
                  className="cursor-pointer text-xxs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 p-2 rounded-xl text-slate-700 dark:text-slate-355 font-bold transition-all text-center shadow-xxs"
                >
                  ล้างเส้นวาด
                </button>
              </div>
            </div>
          )}

          {/* Save & Export buttons */}
          <div className="space-y-2 border-t border-slate-200 dark:border-slate-800/80 pt-3">
            <label className="text-xxs font-bold text-slate-450 dark:text-slate-405 block uppercase tracking-wider">📸 ดาวน์โหลดแผนที่</label>
            <button
              onClick={handleExportImage}
              disabled={imageExporting}
              className="cursor-pointer w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm"
            >
              {imageExporting ? 'กำลังนำออก...' : '🖼️ Export ภาพแผนการรบ'}
            </button>
            {imageError && (
              <p className="text-xxs text-rose-500 font-semibold text-center">{imageError}</p>
            )}
          </div>

          {/* 🎙️ Grouped Media Plan Recording section */}
          <div className="space-y-3 border-t border-slate-200 dark:border-slate-800/80 pt-3">
            <label className="text-xxs font-bold text-slate-450 dark:text-slate-405 block uppercase tracking-wider">📸 บันทึกวิดีโอ</label>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-2xl shadow-xxs space-y-3.5">
              {/* 1. Show existing saved media */}
              {(savedAudioUrl || savedVideoUrl) && (
                <div className="space-y-3">
                  {savedAudioUrl && (
                    <div className="space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50">
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                        <span>🔊</span> เสียงอธิบายแผนรบ
                      </p>
                      <audio src={savedAudioUrl} controls className="w-full h-8 mt-1 focus:outline-none" />
                      {isAdmin && (
                        <button
                          onClick={deleteRecording}
                          className="cursor-pointer text-[9px] font-bold text-rose-500 hover:text-rose-650 mt-1 block"
                        >
                          🗑️ ลบเสียง
                        </button>
                      )}
                    </div>
                  )}

                  {savedVideoUrl && (
                    <div className="space-y-1 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/50">
                      <p className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold flex items-center gap-1">
                        <span>📹</span> วิดีโอนำเสนอหน้าจอ
                      </p>
                      <video src={savedVideoUrl} controls className="w-full rounded-xl mt-1 focus:outline-none border border-slate-200 dark:border-slate-800" />
                      {isAdmin && (
                        <button
                          onClick={deleteVideoRecording}
                          className="cursor-pointer text-[9px] font-bold text-rose-500 hover:text-rose-650 mt-1.5 block"
                        >
                          🗑️ ลบวิดีโอ
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 2. Recording Mode (Toggle actions) */}
              {isAdmin && (
                <div className="space-y-3">
                  {/* Toggle buttons grid */}
                  {!audioUrl && !videoUrl && !isRecording && !isVideoRecording && (
                    <div className="grid grid-cols-2 gap-2">
                      {!savedAudioUrl && (
                        <button
                          onClick={startRecording}
                          className="cursor-pointer flex flex-col items-center justify-center gap-1.5 p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all shadow-xxs"
                        >
                          <span className="text-base">🎤</span>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-250">บันทึกเสียง</span>
                        </button>
                      )}

                      {!savedVideoUrl && (
                        <button
                          onClick={startVideoRecording}
                          className="cursor-pointer flex flex-col items-center justify-center gap-1.5 p-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all shadow-xxs"
                        >
                          <span className="text-base">🎥</span>
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-250">อัดวิดีโอหน้าจอ</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Active Recording States */}
                  {isRecording && (
                    <button
                      onClick={stopRecording}
                      className="cursor-pointer w-full flex items-center justify-between p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900 rounded-xl transition-all animate-pulse"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">🎤 กำลังอัดเสียง...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-rose-750 dark:text-rose-300">
                          {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:
                          {(recordingTime % 60).toString().padStart(2, '0')}
                        </span>
                        <span className="text-[9px] bg-rose-600 text-white px-2 py-0.5 rounded-md font-bold">กดเพื่อหยุด</span>
                      </div>
                    </button>
                  )}

                  {isVideoRecording && (
                    <button
                      onClick={stopVideoRecording}
                      className="cursor-pointer w-full flex items-center justify-between p-3 bg-rose-50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900 rounded-xl transition-all animate-pulse"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">🎥 กำลังอัดหน้าจอ...</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-rose-750 dark:text-rose-300">
                          {Math.floor(videoRecordingTime / 60).toString().padStart(2, '0')}:
                          {(videoRecordingTime % 60).toString().padStart(2, '0')}
                        </span>
                        <span className="text-[9px] bg-rose-600 text-white px-2 py-0.5 rounded-md font-bold">กดเพื่อหยุด</span>
                      </div>
                    </button>
                  )}

                  {/* Previews of newly recorded media (Unsaved) */}
                  {audioUrl && !savedAudioUrl && (
                    <div className="space-y-2 p-2 rounded-xl bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/50">
                      <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                        🎙️ เสียงอธิบายรอเซฟลงแผนรบ
                      </p>
                      <audio src={audioUrl} controls className="w-full h-8 focus:outline-none" />
                      <div className="flex items-center gap-2 justify-between mt-1 text-[9px] font-bold font-sans">
                        <button
                          onClick={() => { deleteRecording(); startRecording(); }}
                          className="cursor-pointer text-indigo-650 hover:text-indigo-700"
                        >
                          🔄 อัดเสียงใหม่
                        </button>
                        <button
                          onClick={deleteRecording}
                          className="cursor-pointer text-rose-500 hover:text-rose-650"
                        >
                          🗑️ ลบทิ้ง
                        </button>
                      </div>
                    </div>
                  )}

                  {videoUrl && !savedVideoUrl && (
                    <div className="space-y-2 p-2 rounded-xl bg-amber-50/40 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/50">
                      <p className="text-[10px] text-amber-650 dark:text-amber-400 font-bold">
                        📹 วิดีโอหน้าจอรอเซฟลงแผนรบ
                      </p>
                      <video src={videoUrl} controls className="w-full rounded-xl focus:outline-none border border-slate-200 dark:border-slate-800" />
                      <div className="flex items-center gap-2 justify-between mt-1 text-[9px] font-bold font-sans">
                        <button
                          onClick={() => { deleteVideoRecording(); startVideoRecording(); }}
                          className="cursor-pointer text-indigo-650 hover:text-indigo-700"
                        >
                          🔄 อัดใหม่
                        </button>
                        <button
                          onClick={deleteVideoRecording}
                          className="cursor-pointer text-rose-500 hover:text-rose-650"
                        >
                          🗑️ ลบทิ้ง
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 3. Non-admin fallback message */}
              {!isAdmin && !savedAudioUrl && !savedVideoUrl && (
                <p className="text-[10px] text-slate-500 text-center py-2">แผนการรบนี้ยังไม่มีสื่อนำเสนอ</p>
              )}
            </div>
          </div>

          {/* Plans Management */}
          <div className="space-y-3 border-t border-slate-200 dark:border-slate-800/80 pt-3">
            <label className="text-xxs font-bold text-slate-450 dark:text-slate-405 block uppercase tracking-wider">💾 เซฟและโหลดแผนการรบ</label>

            {/* Save input form (Admin only) */}
            {isAdmin && (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="พิมพ์ชื่อแผน..."
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-indigo-500 text-slate-800 dark:text-slate-200 flex-1 min-w-0 shadow-xxs"
                />
                <button
                  onClick={handleSavePlan}
                  disabled={isPending}
                  className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold px-3 py-2 rounded-xl transition-all shrink-0"
                >
                  บันทึก
                </button>
              </div>
            )}

            {/* List of saved plans */}
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {plans.length === 0 ? (
                <p className="text-[10px] text-slate-500 text-center py-2">ยังไม่มีแผนการรบในกิลด์</p>
              ) : (
                plans.map(plan => (
                  <div
                    key={plan.id}
                    onClick={() => handleLoadPlan(plan)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-[10px] transition-all cursor-pointer ${selectedPlanId === plan.id ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500 dark:border-indigo-500 font-bold' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-750 shadow-xxs'}`}
                  >
                    <span className="truncate max-w-[150px] text-slate-750 dark:text-slate-200">{plan.plan_name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[8px] text-slate-500 font-mono">
                        {new Date(plan.created_at).toLocaleDateString('th-TH')}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={(e) => handleDeletePlan(plan.id, e)}
                          title="ลบแผน"
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}
