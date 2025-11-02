import { useQuery } from '@apollo/client'
import { GET_USER_DETAIL, GET_USER_STATS } from '../../graphql/admin'
import { AdminUserDetail, AdminUserStats } from '../../types/admin'
import { format } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import { X, User, Mail, Calendar, Activity, TrendingUp, Tags, MapPin } from 'lucide-react'

interface UserDetailModalProps {
  userId: string
  onClose: () => void
}

const UserDetailModal = ({ userId, onClose }: UserDetailModalProps) => {
  const { data: detailData, loading: detailLoading } = useQuery<{ adminGetUserById: AdminUserDetail }>(
    GET_USER_DETAIL,
    { variables: { userId } }
  )

  const { data: statsData, loading: statsLoading } = useQuery<{ adminGetUserStats: AdminUserStats }>(
    GET_USER_STATS,
    { variables: { userId } }
  )

  const detail = detailData?.adminGetUserById
  const stats = statsData?.adminGetUserStats

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">用戶詳細資訊</h2>
            <p className="text-purple-100 text-sm mt-1">完整的用戶數據和活動記錄</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-88px)]">
          {detailLoading || statsLoading ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-spin">⚙️</div>
              <p className="text-gray-600">載入用戶資料...</p>
            </div>
          ) : detail && stats ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <User size={20} />
                  基本資訊
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">用戶名稱</div>
                    <div className="text-lg font-medium text-gray-800">{detail.user.username}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">顯示名稱</div>
                    <div className="text-lg font-medium text-gray-800">{detail.user.displayName || '未設定'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <Mail size={14} />
                      Email
                    </div>
                    <div className="text-lg font-medium text-gray-800">{detail.user.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 flex items-center gap-1">
                      <Calendar size={14} />
                      註冊時間
                    </div>
                    <div className="text-lg font-medium text-gray-800">
                      {format(new Date(detail.user.createdAt), 'PPP', { locale: zhTW })}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">帳戶年齡</div>
                    <div className="text-lg font-medium text-gray-800">{detail.accountAge} 天</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">最後登入</div>
                    <div className="text-lg font-medium text-gray-800">
                      {detail.user.lastLogin
                        ? format(new Date(detail.user.lastLogin), 'PPp', { locale: zhTW })
                        : '從未登入'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Statistics Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="text-2xl mb-1">💭</div>
                  <div className="text-2xl font-bold text-blue-700">{detail.memoriesCount}</div>
                  <div className="text-sm text-blue-600">記憶數量</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border-2 border-green-200">
                  <div className="text-2xl mb-1">🏝️</div>
                  <div className="text-2xl font-bold text-green-700">{detail.islandsCount}</div>
                  <div className="text-sm text-green-600">島嶼數量</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="text-2xl mb-1">💬</div>
                  <div className="text-2xl font-bold text-purple-700">{detail.chatSessionsCount}</div>
                  <div className="text-sm text-purple-600">聊天會話</div>
                </div>
                <div className="bg-pink-50 rounded-xl p-4 border-2 border-pink-200">
                  <div className="text-2xl mb-1">📊</div>
                  <div className="text-2xl font-bold text-pink-700">{stats.activityScore.toFixed(1)}</div>
                  <div className="text-sm text-pink-600">活躍度</div>
                </div>
              </div>

              {/* Active Islands */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <MapPin size={20} />
                  活躍島嶼
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {detail.activeIslands.map(island => (
                    <div
                      key={island.id}
                      className="bg-white rounded-lg p-4 border-2 hover:shadow-md transition-shadow"
                      style={{ borderColor: island.color }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{island.emoji}</span>
                        <span className="font-medium text-gray-800">{island.nameChinese}</span>
                      </div>
                      <div className="text-sm text-gray-600">{island.memoryCount} 個記憶</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Memories by Island */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={20} />
                  記憶分佈
                </h3>
                <div className="space-y-3">
                  {stats.memoriesByIsland.map(item => (
                    <div key={item.islandId} className="bg-white rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{item.islandEmoji}</span>
                          <span className="font-medium text-gray-800">{item.islandName}</span>
                        </div>
                        <div className="text-lg font-bold text-purple-600">{item.count}</div>
                      </div>
                      <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full transition-all"
                          style={{
                            width: `${(item.count / detail.memoriesCount) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Tags */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Tags size={20} />
                  熱門標籤
                </h3>
                <div className="flex flex-wrap gap-2">
                  {stats.topTags.slice(0, 15).map((tagItem, index) => (
                    <div
                      key={index}
                      className="bg-white px-4 py-2 rounded-full border-2 border-purple-200 hover:border-purple-400 transition-colors"
                    >
                      <span className="font-medium text-gray-800">#{tagItem.tag}</span>
                      <span className="ml-2 text-sm text-gray-600">({tagItem.count})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Memories */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Activity size={20} />
                  最近記憶
                </h3>
                <div className="space-y-3">
                  {detail.recentMemories.map(memory => (
                    <div key={memory.id} className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{memory.emoji || '💭'}</span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800 mb-1">
                            {memory.title || '無標題'}
                          </div>
                          <div className="text-sm text-gray-600 line-clamp-2 mb-2">
                            {memory.rawContent}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            {memory.island && (
                              <span className="flex items-center gap-1">
                                <span>{memory.island.emoji}</span>
                                <span>{memory.island.nameChinese}</span>
                              </span>
                            )}
                            <span>{format(new Date(memory.createdAt), 'PPp', { locale: zhTW })}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">😕</div>
              <p className="text-gray-600">無法載入用戶資料</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserDetailModal
