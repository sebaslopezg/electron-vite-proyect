import { useState } from 'react'
import { Form, Button, Card, InputGroup, Col } from 'react-bootstrap'
import Swal from 'sweetalert2'

const Toast = Swal.mixin({
    toast: true,
    position: 'bottom-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
})

export const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [rememberMe, setRememberMe] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!username.trim() || !password.trim()) return

        setLoading(true)
        const res = await window.api.loginUser({ username, password })
        setLoading(false)

        if (res.success) {
            Toast.fire({ icon: 'success', title: `¡Bienvenido, ${res.user.nombre_completo}!` })
            onLoginSuccess(res.user)
        } else {
            Toast.fire({ icon: 'error', title: res.error || 'Credenciales incorrectas' })
        }
    }

    return (
        <main className="bg-light">
            <div className="container">
                <section className="section register min-vh-100 d-flex flex-column align-items-center justify-content-center py-4">
                    <div className="container">
                        <div className="row justify-content-center">
                            <div className="col-lg-4 col-md-6 d-flex flex-column align-items-center justify-content-center">

                                <div className="d-flex justify-content-center py-4">
                                    <div className="logo d-flex align-items-center w-auto border-0 bg-transparent text-decoration-none">
                                        <i className="bi bi-box-seam-fill text-primary fs-3 me-2"></i>
                                        <span className="d-none d-lg-block fs-4 fw-bold text-dark m-0">Caedro</span>
                                    </div>
                                </div>

                                <Card className="mb-3 shadow-sm border-0" style={{ borderRadius: '8px' }}>
                                    <Card.Body className="p-4">
                                        
                                        <div className="pt-2 pb-3">
                                            <h5 className="card-title text-center pb-0 fs-4 fw-bold text-dark">Ingresa a tu Cuenta</h5>
                                            <p className="text-center small text-muted">Escribe tu usuario y contraseña para continuar</p>
                                        </div>

                                        <Form className="row g-3" onSubmit={handleSubmit}>
                                            <Col xs={12}>
                                                <Form.Label className="small fw-bold text-secondary">Usuario de Acceso</Form.Label>
                                                <InputGroup size="sm">
                                                    <InputGroup.Text className="bg-light text-muted">@</InputGroup.Text>
                                                    <Form.Control
                                                        type="text"
                                                        value={username}
                                                        onChange={(e) => setUsername(e.target.value)}
                                                        required
                                                        autoFocus
                                                    />
                                                </InputGroup>
                                            </Col>

                                            <Col xs={12}>
                                                <Form.Label className="small fw-bold text-secondary">Contraseña</Form.Label>
                                                <InputGroup size="sm">
                                                    <InputGroup.Text className="bg-light text-muted"><i className="bi bi-lock"></i></InputGroup.Text>
                                                    <Form.Control
                                                        type="password"
                                                        value={password}
                                                        onChange={(e) => setPassword(e.target.value)}
                                                        required
                                                    />
                                                </InputGroup>
                                            </Col>

                                            <Col xs={12}>
                                                <Form.Check
                                                    type="checkbox"
                                                    id="rememberMe"
                                                    label="Recordar mi sesión"
                                                    className="small text-muted"
                                                    checked={rememberMe}
                                                    onChange={(e) => setRememberMe(e.target.checked)}
                                                />
                                            </Col>

                                            <Col xs={12} className="pt-2">
                                                <Button 
                                                    variant="primary" 
                                                    type="submit" 
                                                    className="w-100 fw-bold shadow-sm" 
                                                    size="sm"
                                                    disabled={loading}
                                                >
                                                    {loading ? (
                                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                                    ) : (
                                                        <i className="bi bi-box-arrow-in-right me-2"></i>
                                                    )}
                                                    Iniciar Sesión
                                                </Button>
                                            </Col>
                                        </Form>

                                    </Card.Body>
                                </Card>

                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}