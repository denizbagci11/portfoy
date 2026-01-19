'use client';

import { useState, useEffect } from 'react';
import { Trash2, UserPlus, AlertTriangle, Loader2 } from 'lucide-react';
import { getUsers, createUserAction, deleteUserAction } from '@/userActions';

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [newUser, setNewUser] = useState('');
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
        const result = await createUserAction(newUser);
        setActionLoading(false);

        if (result.success) {
            alert(`Kullanıcı başarıyla eklendi!\n\nVarsayılan Şifre: ${result.password}\n(Lütfen kullanıcıya iletin)`);
            setNewUser('');
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
                    <span>Veritabanı Aktif (Prisma)</span>
                </div>
            </div>

            <div className="card border-primary mb-4">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h5 className="mb-0">Kullanıcı Yönetimi</h5>
                    {loading && <Loader2 size={18} className="animate-spin" />}
                </div>
                <div className="card-body bg-dark text-white">
                    <div className="alert alert-success border-0 d-flex align-items-center gap-2 bg-success bg-opacity-10 text-success">
                        <AlertTriangle size={18} />
                        <small>Gerçek zamanlı kullanıcı yönetimi aktif. Eklediğiniz kullanıcılar anında sisteme giriş yapabilir.</small>
                    </div>

                    <form onSubmit={handleAddUser} className="d-flex gap-2 mb-4">
                        <input
                            type="text"
                            className="form-control bg-dark text-white border-secondary"
                            placeholder="Yeni Kullanıcı Adı..."
                            value={newUser}
                            onChange={(e) => setNewUser(e.target.value)}
                            disabled={actionLoading}
                        />
                        <button
                            type="submit"
                            className="btn btn-success d-flex align-items-center gap-2"
                            disabled={actionLoading || !newUser.trim()}
                        >
                            {actionLoading ? <Loader2 size={18} className="animate-spin" /> : <UserPlus size={18} />}
                            Ekle
                        </button>
                    </form>

                    <div className="table-responsive">
                        <table className="table table-dark table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>Kullanıcı Adı</th>
                                    <th>Rol</th>
                                    <th>Durum</th>
                                    <th className="text-end">İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.length === 0 && !loading ? (
                                    <tr>
                                        <td colSpan={4} className="text-center py-4 text-muted">Kullanıcı bulunamadı.</td>
                                    </tr>
                                ) : (
                                    users.map(user => (
                                        <tr key={user.id}>
                                            <td>
                                                <span className={user.role === 'admin' ? 'fw-bold text-primary' : ''}>
                                                    {user.username}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${user.role === 'admin' ? 'bg-primary' : 'bg-secondary'}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td>
                                                <span className={`badge ${user.status === 'active' ? 'bg-success' : 'bg-danger'} bg-opacity-75`}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="text-end">
                                                <button
                                                    className="btn btn-sm btn-outline-danger border-0"
                                                    onClick={() => handleDelete(user.id, user.username)}
                                                    disabled={user.role === 'admin' || actionLoading}
                                                    title="Sil"
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
    );
}

