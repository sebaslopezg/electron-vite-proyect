import { useState, useEffect } from 'react'
import Row from 'react-bootstrap/Row'
import Col from 'react-bootstrap/Col'
import { BaseImpresor } from '../../../components/BaseImpresor'
import { getCurrencySymbol, formatCurrency } from '../../../utils/currencies'
import { carteraService } from '../../../services/carteraService'

export const ImpresorAbono = ({ show, onClose, abono, almacenConf, textoVolver }) => {
    
    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' })

    useEffect(() => {
        const loadConfig = async () => {
            const configData = await carteraService.getConfiguracion()
            const confAppRaw = configData.find(c => c.key === 'confApp')
            if (confAppRaw) {
                try {
                    const parsed = JSON.parse(confAppRaw.value)
                    setAppConfig({
                        moneda: parsed.moneda || 'COP',
                        formato_numero: parsed.formato_numero || 'es-CO'
                    })
                } catch(e) {}
            }
        }
        if (show) loadConfig() 
    }, [show])

    if (!abono || !almacenConf) return null

    const renderCurrency = (val) => {
        return formatCurrency(val, appConfig.formato_numero, appConfig.moneda)
    }

    const facturaRef = `${abono.prefijo || ''}${almacenConf.separador || ''}${abono.numero_factura}`

    const PosTemplate = () => (
        <div className="formato-pos text-black">
            <div className="text-center mb-3">
                {almacenConf.logo_almacen && almacenConf.imprimir_logo_pos === 1 && (
                    <div className="mb-2 d-flex justify-content-center">
                        <img src={almacenConf.logo_almacen} alt="Logo" style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain' }} />
                    </div>
                )}
                <h5 className="fw-bold mb-1 text-uppercase">{almacenConf.nombre_almacen}</h5>
                <div>NIT: {almacenConf.nit_almacen}</div>
                <div>{almacenConf.direccion_almacen}</div>
                <div>Tel: {almacenConf.telefono_almacen}</div>
                {almacenConf.email_almacen && <div>Email: {almacenConf.email_almacen}</div>}
                <div className="mt-2 fw-bold border-top border-bottom border-dark py-1 fs-6">
                    RECIBO DE CAJA
                </div>
                <div>Fecha: {new Date(abono.date_created).toLocaleString(appConfig.formato_numero, {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit', hour12: true
                })}</div>
            </div>

            <div className="mb-3">
                <div><strong>Cliente:</strong> {abono.nombre_cliente}</div>
                <div><strong>CC/NIT:</strong> {abono.documento_cliente}</div>
                <div className="mt-1 border-top border-dashed pt-1">
                    <strong>Abono a Factura N°:</strong> {facturaRef}
                </div>
            </div>

            <div className="border border-dark p-2 mb-2 bg-light text-center">
                <div className="fs-6 mb-1">VALOR RECIBIDO</div>
                <h4 className="fw-bold m-0">{renderCurrency(abono.valor)}</h4>
            </div>

            <div className="mb-3 mt-2">
                <div><strong>Método de Pago:</strong> {abono.metodo_pago}</div>
                <div><strong>Cajero:</strong> {abono.usuario}</div>
                {abono.observaciones && (
                    <div className="mt-1"><strong>Obs:</strong> <small>{abono.observaciones}</small></div>
                )}
            </div>

            <div className="text-center mt-4 pt-4 border-top border-dark">
                <div>_________________________</div>
                <div className="fw-bold">Firma de Recibido</div>
            </div>

            <div className="text-center mt-3 pt-2">
                <small>{almacenConf.footer_factura}</small>
            </div>
        </div>
    )

    const A4Template = () => (
        <div className="formato-a4 text-black">
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-2 border-dark pb-3">
                <div className="d-flex align-items-center">
                    {almacenConf.logo_almacen && (
                        <img src={almacenConf.logo_almacen} alt="Logo" style={{ maxHeight: '80px', maxWidth: '150px' }} className="me-4 rounded" />
                    )}
                    <div>
                        <h2 className="fw-bold text-uppercase mb-1">{almacenConf.nombre_almacen}</h2>
                        <div><strong>NIT:</strong> {almacenConf.nit_almacen}</div>
                        <div>{almacenConf.direccion_almacen} | Tel: {almacenConf.telefono_almacen}</div>
                        {almacenConf.email_almacen && <div>Email: {almacenConf.email_almacen}</div>}
                    </div>
                </div>
                <div className="text-end">
                    <h3 className="mb-0 text-success text-uppercase fw-bold">Recibo de Caja</h3>
                    <div>Fecha: {new Date(abono.date_created).toLocaleString(appConfig.formato_numero, {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', hour12: true
                    })}</div>
                </div>
            </div>

            <Row className="mb-4">
                <Col sm={7}>
                    <div className="card border-dark h-100">
                        <div className="card-body py-2">
                            <p className="mb-1"><strong>Cliente:</strong> {abono.nombre_cliente}</p>
                            <p className="mb-1"><strong>CC/NIT:</strong> {abono.documento_cliente}</p>
                            <p className="mb-1"><strong>Método de Pago:</strong> {abono.metodo_pago}</p>
                            {abono.observaciones && <p className="mb-0 text-muted fst-italic">Obs: {abono.observaciones}</p>}
                        </div>
                    </div>
                </Col>
                <Col sm={5}>
                    <div className="card border-success h-100 bg-light">
                        <div className="card-body text-center d-flex flex-column justify-content-center">
                            <p className="mb-1 fw-bold text-secondary">Abono a Factura N° {facturaRef}</p>
                            <h2 className="text-success fw-bold m-0">{renderCurrency(abono.valor)}</h2>
                        </div>
                    </div>
                </Col>
            </Row>

            <Row className="mt-5 pt-5">
                <Col sm={6} className="text-center">
                    <div className="w-75 mx-auto border-top border-dark">
                        <p className="mt-2 fw-bold">Firma Cajero ({abono.usuario})</p>
                    </div>
                </Col>
                <Col sm={6} className="text-center">
                    <div className="w-75 mx-auto border-top border-dark">
                        <p className="mt-2 fw-bold">Firma Cliente</p>
                    </div>
                </Col>
            </Row>

            <div className="text-center mt-5 pt-3 border-top border-dark">
                <p className="fw-bold fs-6">{almacenConf.footer_factura}</p>
            </div>
        </div>
    )

    return <>
        <BaseImpresor 
            show={show} 
            onClose={onClose} 
            titulo="Vista Previa de Recibo"
            textoVolver={textoVolver}
            renderPos={PosTemplate}
            renderA4={A4Template}
        />
    </>
}