import { Calendario } from "./Calendario";
import { Encargos } from "./Encargos";

export const IndexEncargos = () => {
  return (
    <>
      <div className="card">
        <div className="card-title"></div>
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
                tabindex="-1"
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
                tabindex="-1"
              >
                Calendario
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
          </div>
        </div>
      </div>
    </>
  );
};
