import TransactionList from '@/components/TransactionList';

export default function TransactionsPage() {
    return (
        <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-6">İşlem Geçmişi</h2>
            <TransactionList />
        </div>
    );
}
