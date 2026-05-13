import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form'

export default function SubcategoriaModal({ show, handleClose, handleSubmit, form, setForm, editingId, categorias = [] }) {
    return (
        <Modal show={show} onHide={handleClose} centered>
            <Modal.Header closeButton>
                <Modal.Title>{editingId ? 'Editar Subcategoría' : 'Nueva Subcategoría'}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form onSubmit={handleSubmit} id="subcategoriaForm">
                    <Form.Group className="mb-3">
                        <Form.Label>Categoría Principal <span className="text-danger">*</span></Form.Label>
                        <Form.Select required value={form.categoria_id} onChange={(e) => setForm({ ...form, categoria_id: e.target.value })}>
                            <option value="">Seleccione una categoría...</option>
                            {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Nombre <span className="text-danger">*</span></Form.Label>
                        <Form.Control required type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Descripción</Form.Label>
                        <Form.Control as="textarea" rows={2} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
                    </Form.Group>

                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>Prefijo para SKU</Form.Label>
                                <Form.Control type="text" placeholder="Ej: BL" value={form.sku_prefix} onChange={(e) => setForm({ ...form, sku_prefix: e.target.value })} style={{ textTransform: 'uppercase' }} />
                                <Form.Text className="text-muted">Se concatenará al de la categoría.</Form.Text>
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label>Separador SKU</Form.Label>
                                <Form.Control type="text" placeholder="Ej: -" value={form.separador} onChange={(e) => setForm({ ...form, separador: e.target.value })} />
                            </Form.Group>
                        </div>
                    </div>
                </Form>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={handleClose}>Cancelar</Button>
                <Button variant="primary" type="submit" form="subcategoriaForm">Guardar</Button>
            </Modal.Footer>
        </Modal>
    )
}