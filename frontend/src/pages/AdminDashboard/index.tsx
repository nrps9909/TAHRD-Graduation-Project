import { useState } from 'react'
import { useQuery } from '@apollo/client'
import { GET_ALL_USERS, GET_SYSTEM_STATS } from '../../graphql/admin'
import { AdminUsersResponse, AdminSystemStats, AdminUserSummary, UserRole } from '../../types/admin'
import { formatDistanceToNow } from 'date-fns'
import { zhTW } from 'date-fns/locale'
import UserDetailModal from './UserDetailModal'

const AdminDashboard = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 20

  // 獲取系統統計
  const { data: statsData, loading: statsLoading } = useQuery<{ adminGetSystemStats: AdminSystemStats }>(
    GET_SYSTEM_STATS
  )

  // 獲取用戶列表
  const { data: usersData, loading: usersLoading } = useQuery<{ adminGetAllUsers: AdminUsersResponse }>(
    GET_ALL_USERS,
    {
      variables: {
        limit: pageSize,
        offset: currentPage * pageSize
      }
    }
  )

  const stats = statsData?.adminGetSystemStats
  const users = usersData?.adminGetAllUsers.users || []
  const total = usersData?.adminGetAllUsers.total || 0
  const hasMore = usersData?.adminGetAllUsers.hasMore || false

  const handleNextPage = () => {
    if (hasMore) {
      setCurrentPage(prev => prev + 1)
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1)
    }
  }

  const handleUserClick = (userId: string) => {
    setSelectedUserId(userId)
  }

  const handleCloseModal = () => {
    setSelectedUserId(null)
  }

  const getRoleBadgeColor = (role: UserRole) => {
    return role === UserRole.ADMIN
      ? 'bg-red-100 text-red-700 border-red-300'
      : 'bg-blue-100 text-blue-700 border-blue-300'
  }

  const getStatusBadgeColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-700 border-green-300'
      : 'bg-gray-100 text-gray-700 border-gray-300'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">管理者控制台</h1>
          <p className="text-gray-600">系統概覽與用戶管理</p>
        </div>

        {/* System Stats Cards */}
        {statsLoading ? (
          <div className="text-center py-8">
            <div className="text-6xl mb-4 animate-spin">⚙️</div>
            <p className="text-gray-600">載入統計資料...</p>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* 總用戶數 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200">
              <div className="text-3xl mb-2">👥</div>
              <div className="text-2xl font-bold text-gray-800">{stats.totalUsers}</div>
              <div className="text-sm text-gray-600">總用戶數</div>
              <div className="mt-2 text-xs text-gray-500">
                今日活躍: {stats.activeUsersToday} | 本週: {stats.activeUsersThisWeek}
              </div>
            </div>

            {/* 總記憶數 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200">
              <div className="text-3xl mb-2">💭</div>
              <div className="text-2xl font-bold text-gray-800">{stats.totalMemories}</div>
              <div className="text-sm text-gray-600">總記憶數</div>
              <div className="mt-2 text-xs text-gray-500">
                今日新增: {stats.memoriesCreatedToday} | 本週: {stats.memoriesCreatedThisWeek}
              </div>
            </div>

            {/* 總島嶼數 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200">
              <div className="text-3xl mb-2">🏝️</div>
              <div className="text-2xl font-bold text-gray-800">{stats.totalIslands}</div>
              <div className="text-sm text-gray-600">總島嶼數</div>
              <div className="mt-2 text-xs text-gray-500">
                平均每人: {stats.averageIslandsPerUser.toFixed(1)} 個
              </div>
            </div>

            {/* 聊天會話 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-200">
              <div className="text-3xl mb-2">💬</div>
              <div className="text-2xl font-bold text-gray-800">{stats.totalChatSessions}</div>
              <div className="text-sm text-gray-600">聊天會話數</div>
              <div className="mt-2 text-xs text-gray-500">
                平均記憶: {stats.averageMemoriesPerUser.toFixed(1)} 條/人
              </div>
            </div>
          </div>
        ) : null}

        {/* Users Table */}
        <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800">用戶列表</h2>
            <p className="text-sm text-gray-600 mt-1">共 {total} 位用戶</p>
          </div>

          {usersLoading ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-spin">⚙️</div>
              <p className="text-gray-600">載入用戶資料...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      用戶名稱
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      角色
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      狀態
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      記憶數
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      島嶼數
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      最後登入
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user: AdminUserSummary) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                            {user.displayName && (
                              <div className="text-sm text-gray-500">{user.displayName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role === UserRole.ADMIN ? '管理員' : '用戶'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadgeColor(
                            user.isActive
                          )}`}
                        >
                          {user.isActive ? '活躍' : '停用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {user.memoriesCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {user.islandsCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin
                          ? formatDistanceToNow(new Date(user.lastLogin), {
                              addSuffix: true,
                              locale: zhTW
                            })
                          : '從未登入'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleUserClick(user.id)}
                          className="text-purple-600 hover:text-purple-900 font-medium transition-colors"
                        >
                          查看詳情
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              顯示 {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, total)} / {total}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevPage}
                disabled={currentPage === 0}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一頁
              </button>
              <button
                onClick={handleNextPage}
                disabled={!hasMore}
                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一頁
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUserId && (
        <UserDetailModal userId={selectedUserId} onClose={handleCloseModal} />
      )}
    </div>
  )
}

export default AdminDashboard
