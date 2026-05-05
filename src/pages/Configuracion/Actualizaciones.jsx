import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'

export const Actualizaciones = () => {
    const [version, setVersion] = useState('...')
    const [status, setStatus] = useState('idle')
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        if (window.updaterAPI) {
            window.updaterAPI.getVersion().then(setVersion);

            window.updaterAPI.onUpdateAvailable((info) => {
                setStatus('idle')
                Swal.fire({
                    title: '¡Nueva versión disponible!',
                    text: `La versión ${info.version} está lista para descargar.`,
                    icon: 'info',
                    showCancelButton: true,
                    confirmButtonText: 'Descargar ahora',
                    cancelButtonText: 'Más tarde'
                }).then((result) => {
                    if (result.isConfirmed) {
                        setStatus('downloading');
                        window.updaterAPI.downloadUpdate()
                    }
                })
            })

            window.updaterAPI.onUpdateNotAvailable(() => {
                setStatus('idle')
                Swal.fire('Estás al día', `Tienes la versión más reciente (${version}).`, 'success')
            })

            window.updaterAPI.onDownloadProgress((prog) => {
                setStatus('downloading')
                setProgress(Math.round(prog.percent))
            });

            window.updaterAPI.onUpdateDownloaded(() => {
                setStatus('ready');
                Swal.fire({
                    title: '¡Descarga completada!',
                    text: 'La actualización se ha descargado. ¿Deseas reiniciar la aplicación para instalarla ahora?',
                    icon: 'success',
                    showCancelButton: true,
                    confirmButtonText: 'Reiniciar e Instalar',
                    cancelButtonText: 'Luego'
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.updaterAPI.installUpdate()
                    }
                })
            })

            window.updaterAPI.onError((error) => {
                setStatus('idle');
                Swal.fire('Error', `Hubo un error al buscar actualizaciones: ${error}`, 'error')
            })
        }

        return () => {
            if (window.updaterAPI) window.updaterAPI.removeAllListeners()
        }
    }, [version])

    const handleCheckUpdates = () => {
        if (!window.updaterAPI) return;
        setStatus('checking')
        window.updaterAPI.checkUpdates().then(res => {
            if (res?.error) {
                setStatus('idle')
                Swal.fire('Aviso', res.error, 'warning')
            }
        });
    };

    return (
        <div>
            <h5 className="card-title">Actualizaciones del Sistema</h5>
            <div className="alert alert-primary d-flex align-items-center">
                <i className="bi bi-info-circle-fill me-3 fs-3"></i>
                <div>
                    <strong>Versión Actual:</strong> v{version}
                </div>
            </div>

            <div className="mt-4">
                {status === 'idle' && (
                    <button className="btn btn-primary" onClick={handleCheckUpdates}>
                        <i className="bi bi-arrow-clockwise me-2"></i> Buscar Actualizaciones
                    </button>
                )}

                {status === 'checking' && (
                    <button className="btn btn-primary" disabled>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Buscando...
                    </button>
                )}

                {status === 'downloading' && (
                    <div className="mt-3">
                        <p className="mb-1 text-muted">Descargando actualización...</p>
                        <div className="progress" style={{ height: '20px' }}>
                            <div 
                                className="progress-bar progress-bar-striped progress-bar-animated bg-success" 
                                role="progressbar" 
                                style={{ width: `${progress}%` }}
                            >
                                {progress}%
                            </div>
                        </div>
                    </div>
                )}

                {status === 'ready' && (
                    <button className="btn btn-success" onClick={() => window.updaterAPI.installUpdate()}>
                        <i className="bi bi-check-circle me-2"></i> Reiniciar e Instalar
                    </button>
                )}
            </div>
        </div>
    );
};