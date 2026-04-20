import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { useState, useEffect, useRef } from "react";
import Swal from "sweetalert2";
import { Button, Col, Modal, Row } from "react-bootstrap";

function renderEventContent(eventInfo) {
  return (
    <div style={{ overflow: 'hidden', fontSize: '0.85em', lineHeight: '1.2' }}>
      <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
        {eventInfo.event.extendedProps.producto_nombre}
      </div>
      <div style={{ fontStyle: 'italic', opacity: 0.9 }}>
        {eventInfo.event.extendedProps.cliente_nombre}
      </div>
      <div style={{ fontStyle: 'italic', opacity: 0.9 }}>
        {eventInfo.event.extendedProps.producto_cantidad}
      </div>
    </div>
  );
}

export const Calendario = () => {
  const [eventos, setEventos] = useState([]);
  const calendarRef = useRef(null);
  const [show, setShow] = useState(false)
  const [encargoSel, setEncargoSel] = useState([])

  const handleClose = () => setShow(false)
  const handleShow = () => setShow(true)

  useEffect(() => {
    const tabEl = document.getElementById("calendario-tab");

    if (tabEl) {
      const handleTabShown = () => {
        if (calendarRef.current) {
          const calendarApi = calendarRef.current.getApi();
          calendarApi.updateSize();
        }
      };

      tabEl.addEventListener("shown.bs.tab", handleTabShown);

      return () => {
        tabEl.removeEventListener("shown.bs.tab", handleTabShown);
      };
    }
  }, []);

  const loadEncargos = async () => {
    const data = await window.api.getEncargos();
    const formatted = data
      .filter((e) => e.allow_calendar > 0)
      .map((e) => ({
        id: e.id,
        title: `producto: ${e.producto_nombre} cliente: ${e.cliente_nombre}`,
        start: e.fecha_entrega,
        backgroundColor: e.estado_color,
        borderColor: "transparent",
        extendedProps: { ...e },
      }));
    console.log(formatted);

    setEventos(formatted);
  };

  useEffect(() => {
    loadEncargos();
  }, []);

  const handleEventClick = (info) => {
    const encargo = info.event.extendedProps;
    setEncargoSel(encargo)
    handleShow()
  };

  return (
    <div className="card p-4 shadow-sm border-0">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={esLocale}
        events={eventos}
        eventContent={renderEventContent}
        eventClick={handleEventClick}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,dayGridWeek",
        }}
        height="75vh"
        eventClassNames="p-1 shadow-sm"
      />
      <Modal show={show} onHide={handleClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Detalles del encargo</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Row>
            <Col md={6}>
              <p className="mb-1">
                <strong>Fecha de entrega:</strong>{' '}
                <span className="badge bg-primary text-capitalize">{encargoSel.fecha_entrega}</span>
              </p>
              <p className="mb-1"><strong>Estado del encargo:</strong> {encargoSel.estado_titulo}</p>
              <p className="mb-1"><strong>Cliente:</strong> {encargoSel.cliente_nombre}</p>
              <p className="mb-0"><strong>Documento:</strong> {encargoSel.cliente_documento}</p>
              <p className="mb-1"><strong>Descripción:</strong> {encargoSel.descripcion}</p>
              <p className="mb-1"><strong>Producto:</strong> {encargoSel.producto_nombre}</p>
              <p className="mb-1"><strong>cantidad:</strong> {encargoSel.producto_cantidad}</p>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};
