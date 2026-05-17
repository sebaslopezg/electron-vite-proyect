import { useState, useEffect, useMemo } from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { BaseImpresor } from '../../../components/BaseImpresor';
import { formatCurrency } from '../../../utils/currencies';

export const ImpresorReporte = ({ show, onClose, facturas = [], almacenConf, fechaInicio, fechaFin }) => {
    
    const [appConfig, setAppConfig] = useState({ moneda: 'COP', formato_numero: 'es-CO' });

    useEffect(() => {
        const loadConfig = async () => {
            const configData = await window.api.getConfiguracion();
            const confAppRaw = configData.find(c => c.key === 'confApp');
            if (confAppRaw) {
                try {
                    const parsed = JSON.parse(confAppRaw.value);
                    setAppConfig({
                        moneda: parsed.moneda || 'COP',
                        formato_numero: parsed.formato_numero || 'es-CO'
                    });
                } catch(e) {}
            }
        };
        if (show) loadConfig();
    }, [show]);

    const renderCurrency = (val) => formatCurrency(val, appConfig.formato_numero, appConfig.moneda);

    const stats = useMemo(() => {
        return facturas.reduce((acc, f) => {
            acc.total += f.total_factura;
            acc.subtotal += f.subtotal;
            acc.iva += f.iva;
            acc.descuentos += f.descuento;
            acc.efectivoRecibido += (f.total_recibido_original ?? f.total_recibido);
            
            if (f.tipo_pago === 'contado') acc.contado += f.total_factura;
            if (f.tipo_pago === 'credito') acc.credito += f.total_factura;

            // Agrupar por métodos de pago
            const metodo = f.metodo_pago || 'Otros';
            acc.metodos[metodo] = (acc.metodos[metodo] || 0) + f.total_factura;

            return acc;
        }, { total: 0, subtotal: 0, iva: 0, descuentos: 0, contado: 0, credito: 0, efectivoRecibido: 0, metodos: {} });
    }, [facturas]);

    if (!almacenConf) return null;

    const RangoFechas = () => {
        if (fechaInicio === fechaFin) return `Fecha: ${fechaInicio}`;
        return `Desde: ${fechaInicio} | Hasta: ${fechaFin}`;
    };

    const PosTemplate = () => (
        <div className="formato-pos text-black">
            <div className="text-center mb-3">
                <h5 className="fw-bold mb-1 text-uppercase">{almacenConf.nombre_almacen}</h5>
                <div>NIT: {almacenConf.nit_almacen}</div>
                <div className="mt-2 fw-bold border-top border-bottom border-dark py-1">
                    REPORTE DE VENTAS
                </div>
                <div className="small"><RangoFechas /></div>
                <div className="small">Impreso: {new Date().toLocaleString(appConfig.formato_numero)}</div>
            </div>

            <h6 className="fw-bold border-bottom border-dark pb-1 mb-2">RESUMEN GENERAL</h6>
            <div className="d-flex justify-content-between mb-1">
                <span>Total Facturas:</span>
                <span>{facturas.length}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
                <span>Subtotal Ventas:</span>
                <span>{renderCurrency(stats.subtotal)}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
                <span>Descuentos:</span>
                <span>-{renderCurrency(stats.descuentos)}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
                <span>Total IVA:</span>
                <span>{renderCurrency(stats.iva)}</span>
            </div>
            <div className="d-flex justify-content-between fw-bold fs-6 mt-2 pt-1 border-top border-dark">
                <span>TOTAL INGRESOS:</span>
                <span>{renderCurrency(stats.total)}</span>
            </div>

            <h6 className="fw-bold border-bottom border-dark pb-1 mt-3 mb-2">TIPO DE VENTA</h6>
            <div className="d-flex justify-content-between mb-1">
                <span>Contado:</span>
                <span>{renderCurrency(stats.contado)}</span>
            </div>
            <div className="d-flex justify-content-between mb-1">
                <span>Crédito (Cartera):</span>
                <span>{renderCurrency(stats.credito)}</span>
            </div>

            <h6 className="fw-bold border-bottom border-dark pb-1 mt-3 mb-2">MÉTODOS DE PAGO</h6>
            {Object.entries(stats.metodos).map(([metodo, valor]) => (
                <div key={metodo} className="d-flex justify-content-between mb-1 text-capitalize">
                    <span>{metodo}:</span>
                    <span>{renderCurrency(valor)}</span>
                </div>
            ))}
        </div>
    );

    const A4Template = () => (
        <div className="formato-a4 text-black">
            <div className="d-flex justify-content-between align-items-center mb-4 border-bottom border-2 border-dark pb-3">
                <div className="d-flex align-items-center">
                    {almacenConf.logo_almacen && (
                        <img src={almacenConf.logo_almacen} alt="Logo" style={{ maxHeight: '60px', maxWidth: '120px' }} className="me-3 rounded" />
                    )}
                    <div>
                        <h3 className="fw-bold text-uppercase mb-1">{almacenConf.nombre_almacen}</h3>
                        <div>NIT: {almacenConf.nit_almacen}</div>
                    </div>
                </div>
                <div className="text-end">
                    <h4 className="mb-0 text-secondary text-uppercase fw-bold">Reporte de Ventas</h4>
                    <div className="text-muted"><RangoFechas /></div>
                    <div className="small text-muted">Generado: {new Date().toLocaleString(appConfig.formato_numero)}</div>
                </div>
            </div>

            <Row className="mb-4 g-3">
                <Col sm={4}>
                    <div className="border border-dark p-3 rounded h-100 bg-light">
                        <h6 className="fw-bold text-center border-bottom border-dark pb-2">RESUMEN FINANCIERO</h6>
                        <div className="d-flex justify-content-between mt-2"><span>Facturas Emitidas:</span> <strong>{facturas.length}</strong></div>
                        <div className="d-flex justify-content-between mt-1"><span>Subtotal Neto:</span> <strong>{renderCurrency(stats.subtotal)}</strong></div>
                        <div className="d-flex justify-content-between mt-1"><span>Descuentos:</span> <strong className="text-danger">-{renderCurrency(stats.descuentos)}</strong></div>
                        <div className="d-flex justify-content-between mt-1"><span>Impuestos (IVA):</span> <strong>{renderCurrency(stats.iva)}</strong></div>
                        <div className="d-flex justify-content-between mt-2 pt-2 border-top border-dark">
                            <span className="fw-bold fs-5 text-primary">TOTAL VENTAS:</span> 
                            <strong className="fs-5 text-primary">{renderCurrency(stats.total)}</strong>
                        </div>
                    </div>
                </Col>
                <Col sm={4}>
                    <div className="border border-dark p-3 rounded h-100">
                        <h6 className="fw-bold text-center border-bottom border-dark pb-2">TIPO DE VENTA</h6>
                        <div className="d-flex justify-content-between mt-2 fs-5">
                            <span>Contado:</span> <strong className="text-success">{renderCurrency(stats.contado)}</strong>
                        </div>
                        <div className="d-flex justify-content-between mt-3 fs-5">
                            <span>Crédito:</span> <strong className="text-warning">{renderCurrency(stats.credito)}</strong>
                        </div>
                    </div>
                </Col>
                <Col sm={4}>
                    <div className="border border-dark p-3 rounded h-100">
                        <h6 className="fw-bold text-center border-bottom border-dark pb-2">MÉTODOS DE PAGO</h6>
                        {Object.entries(stats.metodos).map(([metodo, valor]) => (
                            <div key={metodo} className="d-flex justify-content-between mt-2 text-capitalize">
                                <span>{metodo}:</span> <strong>{renderCurrency(valor)}</strong>
                            </div>
                        ))}
                    </div>
                </Col>
            </Row>

            <h6 className="fw-bold border-bottom border-dark pb-2 mb-3 text-secondary">Desglose de Facturas</h6>
            <table className="table table-bordered border-dark table-sm text-center align-middle" style={{ fontSize: '0.85rem' }}>
                <thead className="table-light border-dark">
                    <tr>
                        <th>N° Factura</th>
                        <th>Fecha/Hora</th>
                        <th className="text-start">Cliente</th>
                        <th>Tipo</th>
                        <th>Método</th>
                        <th className="text-end">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {facturas.map((f, idx) => (
                        <tr key={idx}>
                            <td className="fw-bold">{f.prefijo || ''}{f.separador || ''}{f.numero_factura}</td>
                            <td>{new Date(f.date_created).toLocaleString(appConfig.formato_numero, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="text-start">{f.nombre_cliente}</td>
                            <td className="text-capitalize">{f.tipo_pago}</td>
                            <td className="text-capitalize">{f.metodo_pago}</td>
                            <td className="text-end fw-bold">{renderCurrency(f.total_factura)}</td>
                        </tr>
                    ))}
                    {facturas.length === 0 && (
                        <tr><td colSpan="6" className="text-muted py-3">No hay facturas en este rango de fechas.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <BaseImpresor 
            show={show} 
            onClose={onClose} 
            titulo="Vista Previa del Reporte de Ventas"
            textoVolver="Cerrar Reporte"
            renderPos={PosTemplate}
            renderA4={A4Template}
        />
    );
};