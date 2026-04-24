import { useState, useEffect, useCallback } from 'react'

export const useFacturas = () => {
    const [facturas, setFacturas] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const loadFacturas = useCallback(async () => {
        try {
            setLoading(true);
            const data = await window.api.getMaestro()
            setFacturas(data);
            setError(null);
        } catch (err) {
            console.error("Error loading invoices:", err)
            setError("No se pudieron cargar las facturas")
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadFacturas()
    }, [loadFacturas])

    return { facturas, loading, error, reload: loadFacturas }
}