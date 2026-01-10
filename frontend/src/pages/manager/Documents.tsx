import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    FileText,
    Search,
    Filter,
    Eye,
    RefreshCw,
    AlertTriangle,
    Shield,
    Plus,
    Trash2,
    Zap,
    ArrowRight
} from 'lucide-react'
import { api } from '../../lib/api'
import { useAuth } from '../../auth/AuthContext'
import { formatDate, buildDocumentUrl } from '../../utils'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Skeleton from '../../components/Skeleton'
import toast from 'react-hot-toast'
import IssueDocumentModal from '../../components/IssueDocumentModal'

interface Document {
    _id: string
    shipmentId?: {
        _id: string
        referenceId: string
        status: string
    }
    customerId?: {
        _id: string
        name: string
        email: string
    }
    driverId?: {
        _id: string
        name: string
    }
    vehicleId?: {
        _id: string
        plateNumber: string
        model: string
    }
    type: string
    fileName: string
    filePath: string
    verified: boolean
    createdAt: string
}

const ALL_CATEGORIES = [
    { id: 'ALL', label: 'All Documents', icon: FileText, roles: ['MANAGER', 'DRIVER', 'CUSTOMER'] },
    { id: 'SHIPMENT', label: 'Shipment-wise', icon: Zap, roles: ['MANAGER', 'DRIVER', 'CUSTOMER'] },
    { id: 'DRIVER', label: 'Driver-wise', icon: Shield, roles: ['MANAGER', 'DRIVER'] },
    { id: 'VEHICLE', label: 'Vehicle-wise', icon: RefreshCw, roles: ['MANAGER', 'DRIVER'] },
    { id: 'CUSTOMER', label: 'Customer-wise', icon: Filter, roles: ['MANAGER', 'CUSTOMER'] },
]

export default function Documents() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [searchTerm, setSearchTerm] = useState('')
    const [category, setCategory] = useState<string | null>(null) // Start with null for block view
    const [filterType, setFilterType] = useState('ALL')
    const [isIssueModalOpen, setIsIssueModalOpen] = useState(false)

    const { data: docs, isLoading } = useQuery({
        queryKey: ['all-docs', category],
        queryFn: async () => {
            const res = await api.get('/docs', {
                params: { category: category === 'ALL' ? undefined : category }
            })
            return res.data.documents as Document[]
        },
        enabled: !!user && category !== null
    })

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/docs/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all-docs'] })
            toast.success('Document removed')
        }
    })

    const filteredDocs = docs?.filter(doc => {
        const matchesSearch =
            doc.shipmentId?.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.customerId?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.driverId?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            doc.vehicleId?.plateNumber.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesType = filterType === 'ALL' || doc.type === filterType
        return matchesSearch && matchesType
    })

    const docTypes = useMemo(() => {
        const types = [
            'ALL',
            'COMMERCIAL_INVOICE',
            'PACKING_LIST',
            'CERTIFICATE_OF_ORIGIN',
            'BILL_OF_LADING',
            'TELEX_RELEASE',
            'SEA_WAYBILL',
            'AIR_WAYBILL',
            'CMR_ROAD_CONSIGNMENT_NOTE',
            'TRIP_SHEET',
            'SHIPPING_BILL',
            'BILL_OF_ENTRY',
            'POD',
            'GST_INVOICE'
        ]
        // Filter types based on role could be added here if needed, but keeping all for now as "Opaque" view handles data
        return types;
    }, [])

    const visibleCategories = useMemo(() => {
        return ALL_CATEGORIES.filter(cat => cat.roles.includes(user?.role || ''))
    }, [user?.role])


    if (!user) return null;

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-500 text-white uppercase tracking-widest">
                            {user.role === 'MANAGER' ? 'Global Logistics Compliance' : 'Secure Paperwork Center'}
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        {category && (
                            <button
                                onClick={() => { setCategory(null); setFilterType('ALL'); }}
                                className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                <RefreshCw className="h-4 w-4 text-slate-600 rotate-180" />
                            </button>
                        )}
                        <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                            {category ? visibleCategories.find(c => c.id === category)?.label : 'Paperwork Control'}
                        </h1>
                    </div>
                    <p className="text-slate-500 text-sm font-medium mt-1">
                        {category ? `Managing ${category.toLowerCase()} critical documents` : 'Select a category to manage specific document types'}
                    </p>
                </div>
                {category && user.role === 'MANAGER' && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsIssueModalOpen(true)}
                            className="btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            <Plus className="h-4 w-4" />
                            New Record
                        </button>
                    </div>
                )}
            </div>

            <AnimatePresence mode="wait">
                {!category ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="space-y-10"
                    >
                        {/* Master Document Type Selector */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden relative group">
                            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                <FileText size={100} />
                            </div>
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                <div className="max-w-md">
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">Paperwork Vault Search</h3>
                                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                                        Select a specific document type to access records in the secure vault.
                                    </p>
                                </div>
                                <div className="flex-1 max-w-sm">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Document Type Selector</label>
                                        <div className="relative">
                                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500" />
                                            <select
                                                onChange={(e) => {
                                                    if (e.target.value !== 'ALL') {
                                                        setCategory('ALL'); // Jump to 'All' category with specific filter
                                                        setFilterType(e.target.value);
                                                    }
                                                }}
                                                className="input-glass w-full py-4 pl-12 pr-10 text-sm font-bold appearance-none cursor-pointer"
                                            >
                                                <option value="ALL">Master Index (Select Type...)</option>
                                                {docTypes.filter(t => t !== 'ALL').map(t => (
                                                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                                                ))}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                <ArrowRight className="h-4 w-4 text-slate-300" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {visibleCategories.filter(c => c.id !== 'ALL').map((cat) => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className="group relative overflow-hidden bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-2xl hover:border-blue-500/30 transition-all text-left"
                                >
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <cat.icon size={120} />
                                    </div>
                                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg bg-blue-600 text-white group-hover:scale-110 transition-transform`}>
                                        <cat.icon className="h-8 w-8" />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{cat.label}</h3>
                                    <p className="text-slate-500 text-sm font-medium max-w-[240px]">
                                        Access specialized documents for {cat.id.toLowerCase()} lifecycle.
                                    </p>
                                    <div className="mt-6 flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest">
                                        Open Vault
                                        <Plus className="h-3 w-3 rotate-45" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                    >
                        {/* Interactive Stats & Filters */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm sticky top-4 z-20 backdrop-blur-md bg-white/80">
                            <div className="relative md:col-span-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search documents..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="input-glass pl-10 w-full"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter className="h-4 w-4 text-slate-400 shrink-0" />
                                <select
                                    value={filterType}
                                    onChange={(e) => setFilterType(e.target.value)}
                                    className="input-glass w-full"
                                >
                                    {docTypes.map(t => (
                                        <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                                    ))}
                                </select>
                            </div>
                            <button
                                onClick={() => setCategory(null)}
                                className="btn-ghost flex items-center justify-center gap-2"
                            >
                                Switch Category
                            </button>
                        </div>

                        {/* Documents Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {isLoading ? (
                                [...Array(6)].map((_, i) => <Skeleton key={i} className="h-56 w-full rounded-2xl" />)
                            ) : filteredDocs && filteredDocs.length > 0 ? (
                                filteredDocs.map((doc) => (
                                    <motion.div
                                        key={doc._id}
                                        layout
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/5 p-6 shadow-sm hover:shadow-xl transition-all relative flex flex-col justify-between"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between mb-4">
                                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 dark:bg-blue-900/20`}>
                                                    <FileText className="h-6 w-6" />
                                                </div>
                                                <span className="px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-600">
                                                    {doc.type.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <h3 className="font-black text-slate-900 dark:text-white truncate mb-4" title={doc.fileName}>
                                                {doc.fileName ? doc.fileName : 'Untitled Document'}
                                            </h3>
                                            <div className="space-y-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                                {doc.shipmentId && (
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Shipment: <span className="text-blue-600">{doc.shipmentId.referenceId}</span></p>
                                                )}
                                                {user.role === 'MANAGER' && doc.customerId && (
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Customer: <span className="text-slate-900 dark:text-slate-300">{doc.customerId.name}</span></p>
                                                )}
                                                {user.role === 'MANAGER' && doc.driverId && (
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase">Driver: <span className="text-slate-900 dark:text-slate-300">{doc.driverId.name}</span></p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                            <span className="text-[10px] text-slate-400 font-bold">{formatDate(doc.createdAt)}</span>
                                            <div className="flex gap-2">
                                                <a href={buildDocumentUrl(doc.filePath)} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg text-slate-400 hover:text-blue-600">
                                                    <Eye className="h-4 w-4" />
                                                </a>
                                                {user.role === 'MANAGER' && (
                                                    <button onClick={() => deleteMutation.mutate(doc._id)} className="p-2 bg-slate-50 dark:bg-white/5 rounded-lg text-slate-400 hover:text-rose-600">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="col-span-full py-32 text-center text-slate-400">
                                    <AlertTriangle className="mx-auto h-12 w-12 opacity-20 mb-4" />
                                    <h4 className="text-lg font-black text-slate-900 dark:text-white">Vault Empty</h4>
                                    <p className="text-sm">No {category?.toLowerCase()} documents found for this criteria.</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <IssueDocumentModal isOpen={isIssueModalOpen} onClose={() => setIsIssueModalOpen(false)} />
        </div>
    )
}
