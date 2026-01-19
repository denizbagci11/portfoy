'use client';

import { useState } from 'react';
import { Trash2, UserPlus, AlertTriangle } from 'lucide-react';

// Mock Data for Demo
const INITIAL_USERS = [
    { id: 1, username: 'deniz.bagci', role: 'admin', status: 'active' },
    { id: 2, username: 'guest_user', role: 'viewer', status: 'inactive' },
];

export default function AdminPage() {
    const [users, setUsers] = useState(INITIAL_USERS);
    const [newUser, setNewUser] = useState('');

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUser.trim()) return;

        const user = {
            id: users.length + 1,
            username: newUser,
            role: 'viewer',
            status: 'active'
        };

        setUsers([...users, user]);
        setNewUser('');
        alert("Kullanıcı (Demo) eklendi!");
    };

    const handleDelete = (id: number) => {
        if (id === 1) {
            alert("Admin kullanıcısı silinemez!");
            return;
        }
        if (confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) {
            setUsers(users.filter(u => u.id !== id));
        }
    };

    return (
        <div className="container py-5">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="mb-0 ls-1">YÖNETİCİ PANELİ</h2>
                <div className="badge bg-warning text-dark d-flex align-items-center gap-2 p-2">
                    <AlertTriangle size={16} />
                    <span>Demo Modu (Vercel)</span>
                </div>
            </div>

            <div className="card border-primary mb-4">
                <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">Kullanıcı Yönetimi</h5>
                </div>
                <div className="card-body bg-dark text-white">
                    <div className="alert alert-info border-0 d-flex align-items-center gap-2">
                        <AlertTriangle size={18} />
                        <small>Not: Vercel üzerinde veritabanı olmadığı için burada yapılan değişiklikler kalıcı olmayacaktır. Mevcut yetkili tek kullanıcı: <strong>deniz.bagci</strong></small>
                    </div>

                    <form onSubmit={handleAddUser} className="d-flex gap-2 mb-4">
                        <input
                            type="text"
                            className="form-control bg-dark text-white border-secondary"
                            placeholder="Yeni Kullanıcı Adı..."
                            value={newUser}
                            onChange={(e) => setNewUser(e.target.value)}
                        />
                        <button type="submit" className="btn btn-success d-flex align-items-center gap-2">
                            <UserPlus size={18} />
                            Ekle
                        </button>
                    </form>

                    <div className="table-responsive">
                        <table className="table table-dark table-hover mb-0">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Kullanıcı Adı</th>
                                    <th>Rol</th>
                                    <th>Durum</th>
                                    <th className="text-end">İşlem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
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
                                                onClick={() => handleDelete(user.id)}
                                                disabled={user.role === 'admin'}
                                                title="Sil"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
