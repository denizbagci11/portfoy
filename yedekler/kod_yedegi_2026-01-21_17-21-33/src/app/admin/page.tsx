'use client';

import { useState, useEffect } from 'react';
import { Trash2, UserPlus, AlertTriangle, Loader2 } from 'lucide-react';
import { getUsers, createUserAction, deleteUserAction, updateUserRoleAction } from '@/userActions';

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [newUser, setNewUser] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState('investor');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadUsers();
    }, []);

    const loadUsers = async () => {
        setLoading(true);
        const data = await getUsers();
        setUsers(data);
        setLoading(false);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.trim()) return;

        setActionLoading(true);
        const result = await createUserAction(newUser, newRole, newPassword);
        setActionLoading(false);

        if (result.success) {
            alert(`Kullanıcı başarıyla eklendi!\n\nKullanıcı: ${newUser}\nŞifre: ${result.password}`);
            setNewUser('');
            setNewPassword('');
            setNewRole('investor');
            loadUsers();
        } else {
            alert(result.error);
        }
    };

    const handleRoleChange = async (id: string, role: string) => {
        setActionLoading(true);
        const result = await updateUserRoleAction(id, role);
        setActionLoading(false);

        if (result.success) {
            loadUsers();
        } else {
            alert(result.error);
        }
    };

    const handleDelete = async (id: string, username: string) => {
        if (confirm(`${username} isimli kullanıcıyı silmek istediğinize emin misiniz?`)) {
            setActionLoading(true);
            const result = await deleteUserAction(id);
            setActionLoading(false);

            if (result.success) {
                loadUsers();
            } else {
                alert(result.error);
            }
        }
    };

    return (
        <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0 ls-1">YÖNETİCİ PANELİ</h2>
                <div className="badge bg-success text-white d-flex align-items-center gap-2 p-2 shadow-sm pulse-slow">
                    <div className="bg-white rounded-circle" style={{ width: '8px', height: '8px' }}></div>
                    <span>Sistem Aktif</span>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-4 mb-4">
                    <div className="card h-100 border-primary">
                        <div className="card-header bg-primary text-white">
                            <h5 className="mb-0 d-flex align-items-center gap-2">
                                <UserPlus size={20} />
                                Yeni Kullanıcı Ekle
                            </h5>
                        </div>
                        <div className="card-body bg-dark">
                            <form onSubmit={handleAddUser}>
                                <div className="mb-3">
                                    <label className="form-label text-light small opacity-75">Kullanıcı Adı</label>
                                    <input
                                        type="text"
                                        className="form-control bg-dark text-white border-secondary"
                                        placeholder="Kullanıcı adı giriniz..."
                                        value={newUser}
                                        onChange={(e) => setNewUser(e.target.value)}
                                        disabled={actionLoading}
                                        required
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-light small opacity-75">Şifre (Opsiyonel)</label>
                                    <input
                                        type="password"
                                        className="form-control bg-dark text-white border-secondary"
                                        placeholder="Boş bırakılırsa varsayılan atanır"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        disabled={actionLoading}
                                    />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label text-light small opacity-75">Yetki Seviyesi</label>
                                    <select
                                        className="form-select bg-dark text-white border-secondary"
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                        disabled={actionLoading}
                                    >
                                        <option value="investor">Yatırımcı (Investor)</option>
                                        <option value="viewer">Gözlemci (Viewer)</option>
                                        <option value="admin">Yönetici (Admin)</option>
                                    </select>
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-success w-100 d-flex align-items-center justify-content-center gap-2"
                                    disabled={actionLoading || !newUser.trim()}
                                >
                                    {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                                    Kullanıcıyı Kaydet
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                <div className="col-lg-8 mb-4">
                    <div className="card border-primary">
                        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Kullanıcı Listesi</h5>
                            {loading && <Loader2 size={18} className="animate-spin" />}
                        </div>
                        <div className="card-body bg-dark p-0">
                            <div className="table-responsive">
                                <table className="table table-dark table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th className="px-4 py-3">Kullanıcı</th>
                                            <th className="py-3">Yetki</th>
                                            <th className="py-3 text-end px-4">İşlemler</th>
                                        </tr>
                                    </thead>
                                    <tbody className="border-top border-secondary">
                                        {users.length === 0 && !loading ? (
                                            <tr>
                                                <td colSpan={3} className="text-center py-5 text-muted">Kullanıcı bulunamadı.</td>
                                            </tr>
                                        ) : (
                                            users.map(user => (
                                                <tr key={user.id} className="align-middle">
                                                    <td className="px-4 py-3">
                                                        <div className="d-flex flex-column">
                                                            <span className={`fw-bold ${user.role === 'admin' ? 'text-primary' : ''}`}>
                                                                {user.username}
                                                            </span>
                                                            <small className="opacity-50" style={{ fontSize: '0.75rem' }}>
                                                                {new Date(user.createdAt).toLocaleDateString('tr-TR')} tarihinde katıldı
                                                            </small>
                                                        </div>
                                                    </td>
                                                    <td className="py-3">
                                                        <select
                                                            className={`form-select form-select-sm bg-dark text-white border-secondary w-auto ${user.username === 'deniz.bagci' ? 'opacity-50' : ''}`}
                                                            value={user.role}
                                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                                            disabled={user.username === 'deniz.bagci' || actionLoading}
                                                            style={{ minWidth: '120px' }}
                                                        >
                                                            <option value="investor">Investor</option>
                                                            <option value="viewer">Viewer</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-3 text-end px-4">
                                                        <button
                                                            className="btn btn-sm btn-outline-danger border-0 hover-bg-danger"
                                                            onClick={() => handleDelete(user.id, user.username)}
                                                            disabled={user.username === 'deniz.bagci' || actionLoading}
                                                            title="Kullanıcıyı Sil"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

