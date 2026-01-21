import TransactionForm from '@/components/TransactionForm';

export default function AddPage() {
    return (
        <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-6 text-center">İşlem Ekle</h2>
            <TransactionForm />
        </div>
    );
}
