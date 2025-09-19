export interface Achievement {
  id: string
  title: string
  description: string
  icon: string
  type: 'skill' | 'milestone' | 'streak' | 'special'
  points: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}
