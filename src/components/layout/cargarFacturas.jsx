export const cargarFacturas = () => {
    const [facturas, setFacturas] = useState([])
    const loadFacturas = async () => {
        const data = await window.api.getMaestro()
        console.log(data);

        setFacturas(data)
    }

    useEffect(() => {
        loadFacturas()
    }, [])

    return facturas
}