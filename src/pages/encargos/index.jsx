import { Calendario } from "./Calendario"
import { Encargos } from "./Encargos"
import { Estados } from "./Estados"

export const IndexEncargos = () => {
  return<>
      <div className="pagetitle">
        <h1><i className="bi bi-calendar-event"></i> Encargos</h1>
      </div>
      <div className="card">
        <div className="card-body">
          <ul
            className="nav nav-tabs nav-tabs-bordered mt-3"
            id="borderedTab"
            role="tablist"
          >
            <li className="nav-item" role="presentation">
              <button
                className="nav-link active"
                id="encargos-tab"
                data-bs-toggle="tab"
                data-bs-target="#encargos"
                type="button"
                role="tab"
                aria-controls="home"
                aria-selected="false"
                tabIndex="-1"
              >
                Encargos
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className="nav-link"
                id="calendario-tab"
                data-bs-toggle="tab"
                data-bs-target="#calendario"
                type="button"
                role="tab"
                aria-controls="home"
                aria-selected="false"
                tabIndex="-1"
              >
                Calendario
              </button>
            </li>
            <li className="nav-item" role="presentation">
              <button
                className="nav-link"
                id="estados-tab"
                data-bs-toggle="tab"
                data-bs-target="#estados"
                type="button"
                role="tab"
                aria-controls="home"
                aria-selected="false"
                tabIndex="-1"
              >
                Estados
              </button>
            </li>
          </ul>

          <div className="tab-content pt-2" id="borderedTabContent">
            <div
              className="tab-pane fade show active"
              id="encargos"
              role="tabpanel"
              aria-labelledby="encargos-tab"
            >
              <Encargos />
            </div>
            <div
              className="tab-pane fade"
              id="calendario"
              role="tabpanel"
              aria-labelledby="calendario-tab"
            >
              <Calendario />
            </div>
            <div
              className="tab-pane fade"
              id="estados"
              role="tabpanel"
              aria-labelledby="estados-tab"
            >
              <Estados />
            </div>
          </div>
        </div>
      </div>
  </>
}