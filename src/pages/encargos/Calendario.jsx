import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { useState, useEffect, useRef } from "react";

export const Calendario = () => {
  const [eventos, setEventos] = useState([]);
  const calendarRef = useRef(null);

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

    const formatted = data.map((e) => ({
      id: e.id,
      title: `${e.cliente_nombre}: ${e.descripcion}`,
      start: e.fecha_entrega,
      backgroundColor: e.estado === "pendiente" ? "#ffc107" : "#198754",
      borderColor: "transparent",
      extendedProps: { ...e },
    }));

    setEventos(formatted);
  };

  useEffect(() => {
    loadEncargos();
  }, []);

  const handleEventClick = (info) => {
    const encargo = info.event.extendedProps;
    Swal.fire({
      title: `Encargo: ${encargo.cliente_nombre}`,
      text: `Descripción: ${encargo.descripcion}`,
      icon: "info",
    });
  };

  return (
    <div className="card p-4 shadow-sm border-0">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={esLocale}
        events={eventos}
        eventClick={handleEventClick}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,dayGridWeek",
        }}
        height="75vh"
        eventClassNames="p-1 shadow-sm"
      />
    </div>
  );
};
