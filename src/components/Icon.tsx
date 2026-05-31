import { isIOS } from '../lib/platform'
import {
  House, Flower2, Mic, MicVocal, ClipboardList, Pin, Calendar,
  CalendarDays, BarChart3, ChartNoAxesCombined, Medal, Award,
  Settings, Heart, Ear, HeartHandshake, Headphones, Flame,
  Satellite, Music, Brain, HeartOff, Check, X, Pencil,
  Circle, Globe, Palette, Sun, Moon, Sparkles, Smartphone,
  Laptop, Info, Upload, Download, KeyRound, RotateCcw,
  Link, Rocket, Trash2, Timer, FastForward, Camera, Ribbon,
  Waves, Leaf, PartyPopper, Star, Crown, Cat, ListTodo,
  Volume2, VolumeX, MessageSquare, Bookmark, Hash, Search,
  FolderOpen, Lightbulb, User, AlarmClock,
  type LucideIcon,
} from 'lucide-react'

const emojiToIcon: Record<string, LucideIcon> = {
  '🏠': House,
  '🌸': Flower2,
  '🎤': Mic,
  '🎙️': MicVocal,
  '📋': ClipboardList,
  '📌': Pin,
  '📅': Calendar,
  '🗓️': CalendarDays,
  '📊': BarChart3,
  '📈': ChartNoAxesCombined,
  '🏅': Medal,
  '🥇': Award,
  '⚙️': Settings,
  '💖': Heart,
  '💕': Heart,
  '👂': Ear,
  '💝': HeartHandshake,
  '🎧': Headphones,
  '🔥': Flame,
  '📡': Satellite,
  '🎵': Music,
  '🧠': Brain,
  '💔': HeartOff,
  '✅': Check,
  '❌': X,
  '✏️': Pencil,
  '🟢': Circle,
  '🔴': Circle,
  '🌐': Globe,
  '🎨': Palette,
  '☀️': Sun,
  '🌙': Moon,
  '✨': Sparkles,
  '📱': Smartphone,
  '💻': Laptop,
  'ℹ️': Info,
  '📤': Upload,
  '📥': Download,
  '🔑': KeyRound,
  '🔄': RotateCcw,
  '🔗': Link,
  '🚀': Rocket,
  '🗑️': Trash2,
  '⏱️': Timer,
  '⏩': FastForward,
  '📷': Camera,
  '🎀': Ribbon,
  '🌊': Waves,
  '🌿': Leaf,
  '🎉': PartyPopper,
  '⭐': Star,
  '👑': Crown,
  '🐱': Cat,
  '📝': ListTodo,
  '🔊': Volume2,
  '🔇': VolumeX,
  '💬': MessageSquare,
  '📑': Bookmark,
  '#': Hash,
  '🔍': Search,
  '📂': FolderOpen,
  '💡': Lightbulb,
  '🧑': User,
  '⏰': AlarmClock,
}

interface Props {
  emoji: string
  size?: number
  className?: string
  color?: string
}

export default function Icon({ emoji, size = 18, className, color }: Props) {
  const LucideIcon = isIOS ? null : emojiToIcon[emoji]

  if (LucideIcon) {
    return <LucideIcon size={size} className={className} style={color ? { color } : undefined} />
  }

  return (
    <span className={className} style={{ fontSize: size, lineHeight: 1 }}>
      {emoji}
    </span>
  )
}
