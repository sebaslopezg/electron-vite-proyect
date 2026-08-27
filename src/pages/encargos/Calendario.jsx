import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import esLocale from "@fullcalendar/core/locales/es"
import { useState, useEffect, useRef } from "react"
import { EncargoDetalles } from "./components/EncargoDetalles"
import { encargosService } from "../../services/encargosService"

function renderEventContent(eventInfo) {
  const nombreAmostrar = eventInfo.event.extendedProps.producto_nombre || 'Pedido General de Factura'
  
  return <>
    <div style={{ overflow: 'hidden', fontSize: '0.85em', lineHeight: '1.2' }}>
      <div style={{ fontWeight: 'bold', textTransform: 'uppercase', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {nombreAmostrar}
      </div>
      <div style={{ fontStyle: 'italic', opacity: 0.9, whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
        {eventInfo.event.extendedProps.cliente_nombre}
      </div>
      <div style={{ fontStyle: 'italic', opacity: 0.9 }}>
        Cant: {eventInfo.event.extendedProps.producto_cantidad}
      </div>
    </div>
  </>
}

export const Calendario = () => {
  const [eventos, setEventos] = useState([])
  const calendarRef = useRef(null)
  const [show, setShow] = useState(false)
  const [encargoSel, setEncargoSel] = useState([])

  const handleClose = () => setShow(false)
  const handleShow = () => setShow(true)

  useEffect(() => {
    const tabEl = document.getElementById("calendario-tab")

    if (tabEl) {
      const handleTabShown = () => {
        if (calendarRef.current) {
          const calendarApi = calendarRef.current.getApi()
          calendarApi.updateSize()
        }
      }

      tabEl.addEventListener("shown.bs.tab", handleTabShown)

      return () => {
        tabEl.removeEventListener("shown.bs.tab", handleTabShown)
      }
    }
  }, [])

  const loadEncargos = async () => {
    const data = await encargosService.getEncargos()
    const formatted = data
      .filter((e) => e.fecha_entrega && e.allow_calendar > 0)
      .map((e) => ({
        id: e.id,
        title: `${e.producto_nombre || 'Factura'} - ${e.cliente_nombre}`,
        start: e.fecha_entrega,
        backgroundColor: e.estado_color || '#6c757d',
        borderColor: "transparent",
        extendedProps: { ...e },
      }))
    setEventos(formatted)
  }

  useEffect(() => {
    loadEncargos()

    const handleActualizacionExterna = () => {
        loadEncargos()
    }

    window.addEventListener('encargos-actualizados', handleActualizacionExterna)
    window.addEventListener('estados-actualizados', handleActualizacionExterna)
    
    return () => {
        window.removeEventListener('encargos-actualizados', handleActualizacionExterna)
        window.removeEventListener('estados-actualizados', handleActualizacionExterna)
    }
  }, [])

  const handleEventClick = (info) => {
    const encargo = info.event.extendedProps
    setEncargoSel(encargo)
    handleShow()
  }

  return <>
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
      <EncargoDetalles
        show={show}
        handleClose={handleClose}
        encargoData={encargoSel}
        onVerFactura={(numeroFactura) => {
          window.dispatchEvent(new CustomEvent('request-ver-factura', { detail: numeroFactura }))
        }}
      />
    </div>
  </>
}