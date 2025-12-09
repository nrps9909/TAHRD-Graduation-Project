// Core components
export { default as ErrorBoundary } from './core/ErrorBoundary'
export { default as LoadingScreen } from './core/LoadingScreen'

// Game components
export { default as GameLayout } from './game/GameLayout'
export { default as TutorialScene } from './game/TutorialScene'
export { default as SceneRenderer } from './game/SceneRenderer'
export { default as Sidebar } from './game/Sidebar'
export { default as ProgressBar } from './game/ProgressBar'

// UI components
export { default as InstantFeedback } from './ui/InstantFeedback'
export { default as AchievementNotification } from './ui/AchievementNotification'
export { default as MobileMenu } from './ui/MobileMenu'

// Feature components
export { default as IntroScreen } from './features/IntroScreen'
export { default as OSSelection } from './features/OSSelection'
export { default as CompletionScreen } from './features/CompletionScreen'
export { default as CodeChallenge } from './features/CodeChallenge'
export { default as CodeEditor } from './features/CodeEditor'
export { default as InteractiveDemo } from './features/InteractiveDemo'
export { default as InteractiveLesson } from './features/InteractiveLesson'
export { default as VirtualTeacher } from './features/VirtualTeacher'
export { default as WSLSetupGuide } from './features/WSLSetupGuide'
export { default as WorkspaceViewer } from './features/WorkspaceViewer'
export { default as WebPreview } from './features/WebPreview'
export { default as QuickProjectCreator } from './features/QuickProjectCreator'
export { default as Live2DPixi6 } from './features/Live2DPixi6'

// Additional feature components (currently unused but available)
export { default as Terminal } from './features/Terminal'
export { default as GitTerminal } from './features/GitTerminal'
export { default as VirtualChatList } from './features/VirtualChatList'
export { OSAwareContent } from './features/OSAwareContent'
