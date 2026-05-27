import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import defaultLogo from './../../assets/favicon.png'

export const Header = ({ currentUser, onLogout }) => {
    const [searchBarShow, setSearchBarShow] = useState(false)
    const [appName, setAppName] = useState('Caedro')
    const [appLogo, setAppLogo] = useState(defaultLogo)
    const [userVisual, setUserVisual] = useState(currentUser)

    const loadConfig = async () => {
        try {
            const data = await window.api.getConfiguracion()
            const appConf = data.find(r => r.key === 'confApp')
            if (appConf && appConf.value) {
                const parsed = JSON.parse(appConf.value)
                if (parsed.nombre) setAppName(parsed.nombre)
                if (parsed.logo) setAppLogo(parsed.logo)
                
                document.title = parsed.nombre || 'Caedro'
                if (window.api.updateWindow) window.api.updateWindow({ nombre: parsed.nombre, logo: parsed.logo })
            }
        } catch (error) {
            console.error("Error cargando configuración en Header:", error)
        }
    }

    useEffect(() => {
        loadConfig()
        const handleUpdate = () => loadConfig()
        window.addEventListener('config-actualizada', handleUpdate)
        
        const handleProfileUpdate = (e) => setUserVisual(e.detail)
        window.addEventListener('perfil-actualizado', handleProfileUpdate)

        return () => {
            window.removeEventListener('config-actualizada', handleUpdate)
            window.removeEventListener('perfil-actualizado', handleProfileUpdate)
        }
    }, [])

    useEffect(() => {
        if (currentUser) setUserVisual(currentUser)
    }, [currentUser])

    const handleSidebarToggle = () => {
        document.body.classList.toggle('toggle-sidebar')
    }

    const handleSearchBarToggle = (e) => {
        e.preventDefault()
        setSearchBarShow(!searchBarShow)
    }

    const primerNombre = currentUser?.nombre_completo?.split(' ')[0] || 'Usuario'

    return <>
    <header id="header" className="header fixed-top d-flex align-items-center">
            <div className="d-flex align-items-center justify-content-between">
                <Link to="/" className="logo d-flex align-items-center text-decoration-none">
                    <img src={appLogo} alt="Logo" style={{ maxHeight: '40px', objectFit: 'contain' }} />
                    <span className="d-none d-lg-block ms-2">{appName}</span>
                </Link>
                <i 
                    className="bi bi-list toggle-sidebar-btn ms-3" 
                    onClick={handleSidebarToggle}
                    style={{ cursor: 'pointer' }}
                ></i>
            </div>

            <nav className="header-nav ms-auto">
                <ul className="d-flex align-items-center">
                    <li className="nav-item d-block d-lg-none">
                        <a 
                            className="nav-link nav-icon search-bar-toggle" 
                            href="#" onClick={handleSearchBarToggle}
                        >
                            <i className="bi bi-search"></i>
                        </a>
                    </li>

                    {/*
                    <li className="nav-item dropdown">
                        <a className="nav-link nav-icon" href="#" data-bs-toggle="dropdown">
                            <i className="bi bi-bell"></i>
                            <span className="badge bg-primary badge-number">4</span>
                        </a>

                        <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow notifications">
                            <li className="dropdown-header">
                                You have 4 new notifications
                                <a href="#"><span className="badge rounded-pill bg-primary p-2 ms-2">View all</span></a>
                            </li>
                            <li><hr className="dropdown-divider" /></li>

                            <li className="notification-item">
                                <i className="bi bi-exclamation-circle text-warning"></i>
                                <div>
                                    <h4>Lorem Ipsum</h4>
                                    <p>Quae dolorem earum veritatis oditseno</p>
                                    <p>30 min. ago</p>
                                </div>
                            </li>

                            <li><hr className="dropdown-divider" /></li>

                            <li className="notification-item">
                                <i className="bi bi-x-circle text-danger"></i>
                                <div>
                                    <h4>Atque rerum nesciunt</h4>
                                    <p>Quae dolorem earum veritatis oditseno</p>
                                    <p>1 hr. ago</p>
                                </div>
                            </li>

                            <li><hr className="dropdown-divider" /></li>

                            <li className="notification-item">
                                <i className="bi bi-check-circle text-success"></i>
                                <div>
                                    <h4>Sit rerum fuga</h4>
                                    <p>Quae dolorem earum veritatis oditseno</p>
                                    <p>2 hrs. ago</p>
                                </div>
                            </li>

                            <li><hr className="dropdown-divider" /></li>

                            <li className="notification-item">
                                <i className="bi bi-info-circle text-primary"></i>
                                <div>
                                    <h4>Dicta reprehenderit</h4>
                                    <p>Quae dolorem earum veritatis oditseno</p>
                                    <p>4 hrs. ago</p>
                                </div>
                            </li>

                            <li><hr className="dropdown-divider" /></li>
                            <li className="dropdown-footer">
                                <a href="#">Show all notifications</a>
                            </li>
                        </ul>
                    </li> 
                    */}

                    {/*
                    <li className="nav-item dropdown">
                        <a className="nav-link nav-icon" href="#" data-bs-toggle="dropdown">
                            <i className="bi bi-chat-left-text"></i>
                            <span className="badge bg-success badge-number">3</span>
                        </a>

                        <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow messages">
                            <li className="dropdown-header">
                                You have 3 new messages
                                <a href="#"><span className="badge rounded-pill bg-primary p-2 ms-2">View all</span></a>
                            </li>
                            <li><hr className="dropdown-divider" /></li>

                            <li className="message-item">
                                <a href="#">
                                    <img src="assets/img/messages-1.jpg" alt="" className="rounded-circle" />
                                    <div>
                                        <h4>Maria Hudson</h4>
                                        <p>Velit asperiores et ducimus soluta repudiandae labore officia est ut...</p>
                                        <p>4 hrs. ago</p>
                                    </div>
                                </a>
                            </li>
                            <li><hr className="dropdown-divider" /></li>

                            <li className="message-item">
                                <a href="#">
                                    <img src="assets/img/messages-2.jpg" alt="" className="rounded-circle" />
                                    <div>
                                        <h4>Anna Nelson</h4>
                                        <p>Velit asperiores et ducimus soluta repudiandae labore officia est ut...</p>
                                        <p>6 hrs. ago</p>
                                    </div>
                                </a>
                            </li>
                            <li><hr className="dropdown-divider" /></li>

                            <li className="message-item">
                                <a href="#">
                                    <img src="assets/img/messages-3.jpg" alt="" className="rounded-circle" />
                                    <div>
                                        <h4>David Muldon</h4>
                                        <p>Velit asperiores et ducimus soluta repudiandae labore officia est ut...</p>
                                        <p>8 hrs. ago</p>
                                    </div>
                                </a>
                            </li>
                            <li><hr className="dropdown-divider" /></li>

                            <li className="dropdown-footer">
                                <a href="#">Show all messages</a>
                            </li>
                        </ul>
                    </li> 
                    */}



                    <li className="nav-item dropdown pe-4">
                        <a className="nav-link nav-profile d-flex align-items-center pe-0" href="#" data-bs-toggle="dropdown">
                            {userVisual?.foto_perfil ? (
                                <img src={userVisual.foto_perfil} alt="Profile" className="rounded-circle" style={{ width: '36px', height: '36px', objectFit: 'cover' }} />
                            ) : (
                                /* CORREGIDO: Inicial dinámica con fondo de color si no hay avatar */
                                <div 
                                    className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold shadow-sm" 
                                    style={{ width: '36px', height: '36px', fontSize: '0.95rem', minWidth: '36px' }}
                                >
                                    {userVisual?.nombre_completo ? userVisual.nombre_completo.charAt(0).toUpperCase() : 'U'}
                                </div>
                            )}
                            <span className="d-none d-md-block dropdown-toggle ps-2 fw-bold text-secondary">{primerNombre}</span>
                        </a>

                        <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow profile shadow-sm border-0">
                            <li className="dropdown-header text-start px-4 pt-3 pb-2 bg-light rounded-top">
                                <h6 className="fw-bold text-dark mb-1">{userVisual?.nombre_completo || 'Usuario del Sistema'}</h6>
                                <span className="badge bg-primary text-white">{userVisual?.rol || 'No asignado'}</span>
                            </li>
                            <li><hr className="dropdown-divider m-0" /></li>

                            <li>
                                <Link className="dropdown-item d-flex align-items-center py-2 px-4" to="/perfil">
                                    <i className="bi bi-person fs-5 me-3 text-secondary"></i>
                                    <span className="fw-medium">Mi Perfil Personal</span>
                                </Link>
                            </li>
                            <li><hr className="dropdown-divider m-0" /></li>

                            <li>
                                <a className="dropdown-item d-flex align-items-center text-danger py-2 px-4" href="#" onClick={(e) => { e.preventDefault(); onLogout(); }}>
                                    <i className="bi bi-box-arrow-right fs-5 me-3"></i>
                                    <span className="fw-bold">Cerrar Sesión</span>
                                </a>
                            </li>
                        </ul>
                    </li>


                </ul>
            </nav>
        </header>
    </>
}

export const useDashboardEffects = () => {
    const [showBackToTop, setShowBackToTop] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY
            
            const header = document.getElementById('header')
            if (header) {
                if (scrollY > 100) {
                    header.classList.add('header-scrolled')
                } else {
                    header.classList.remove('header-scrolled')
                }
            }

            setShowBackToTop(scrollY > 100)

            const navbarlinks = document.querySelectorAll('#navbar .scrollto')
            const position = scrollY + 200
            
            navbarlinks.forEach(navbarlink => {
                if (!navbarlink.hash) return
                const section = document.querySelector(navbarlink.hash)
                if (!section) return
                
                if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
                    navbarlink.classList.add('active')
                } else {
                    navbarlink.classList.remove('active')
                }
            })
        }

        window.addEventListener('scroll', handleScroll)
        handleScroll()

        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    useEffect(() => {
        if (!window.bootstrap) return

        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        
        const tooltipList = tooltipTriggerList.map(tooltipTriggerEl => {
            return new window.bootstrap.Tooltip(tooltipTriggerEl)
        })

        return () => {
            tooltipList.forEach(tooltip => tooltip.dispose())
        }
    }, [])

    useEffect(() => {
        if (!window.Quill) return

        const editors = []

        const defaultEditor = document.querySelector('.quill-editor-default')
        if (defaultEditor && !defaultEditor.classList.contains('ql-container')) {
            editors.push(new window.Quill(defaultEditor, { theme: 'snow' }))
        }

        const bubbleEditor = document.querySelector('.quill-editor-bubble')
        if (bubbleEditor && !bubbleEditor.classList.contains('ql-container')) {
            editors.push(new window.Quill(bubbleEditor, { theme: 'bubble' }))
        }

        const fullEditor = document.querySelector('.quill-editor-full')
        if (fullEditor && !fullEditor.classList.contains('ql-container')) {
            editors.push(new window.Quill(fullEditor, {
                modules: {
                    toolbar: [
                        [{ font: [] }, { size: [] }],
                        ["bold", "italic", "underline", "strike"],
                        [{ color: [] }, { background: [] }],
                        [{ script: "super" }, { script: "sub" }],
                        [{ list: "ordered" }, { list: "bullet" }, { indent: "-1" }, { indent: "+1" }],
                        ["direction", { align: [] }],
                        ["link", "image", "video"],
                        ["clean"]
                    ]
                },
                theme: "snow"
            }))
        }
    }, [])

    useEffect(() => {
        if (!window.tinymce) return;

        const useDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches

        window.tinymce.init({
            selector: 'textarea.tinymce-editor',
            plugins: 'preview importcss searchreplace autolink autosave save directionality code visualblocks visualchars fullscreen image link media codesample table charmap pagebreak nonbreaking anchor insertdatetime advlist lists wordcount help charmap quickbars emoticons accordion',
            menubar: 'file edit view insert format tools table help',
            toolbar: "undo redo | accordion accordionremove | blocks fontfamily fontsize | bold italic underline strikethrough | align numlist bullist | link image | table media | lineheight outdent indent| forecolor backcolor removeformat | charmap emoticons | code fullscreen preview | save print | pagebreak anchor codesample | ltr rtl",
            height: 600,
            skin: useDarkMode ? 'oxide-dark' : 'oxide',
            content_css: useDarkMode ? 'dark' : 'default',
        });

        return () => {
            window.tinymce.remove()
        }
    }, [])

    useEffect(() => {
        if (!window.simpleDatatables) return

        const datatables = document.querySelectorAll('.datatable')
        const instances = []

        datatables.forEach(datatable => {
            if (!datatable.classList.contains('dataTable-wrapper')) {
                const instance = new window.simpleDatatables.DataTable(datatable, {
                    perPageSelect: [5, 10, 15, ["All", -1]],
                    columns: [
                        { select: 2, sortSequence: ["desc", "asc"] },
                        { select: 3, sortSequence: ["desc"] },
                        { select: 4, cellClass: "green", headerClass: "red" }
                    ]
                })
                instances.push(instance)
            }
        })

        return () => {
            instances.forEach(instance => {
                if (instance && instance.destroy) {
                    instance.destroy();
                }
            })
        }
    }, [])

    useEffect(() => {
        if (!window.echarts) return

        const mainContainer = document.getElementById('main')
        if (!mainContainer) return

        const resizeObserver = new ResizeObserver(() => {
            const echartElements = document.querySelectorAll('.echart')
            echartElements.forEach(element => {
                const instance = window.echarts.getInstanceByDom(element)
                if (instance) {
                    instance.resize()
                }
            })
        })

        const timer = setTimeout(() => {
            resizeObserver.observe(mainContainer)
        }, 200)

        return () => {
            clearTimeout(timer)
            resizeObserver.disconnect()
        }
    }, [])

    useEffect(() => {
        const forms = document.querySelectorAll('.needs-validation')

        const handleSubmit = (event) => {
            const form = event.target
            if (!form.checkValidity()) {
                event.preventDefault()
                event.stopPropagation()
            }
            form.classList.add('was-validated')
        }

        forms.forEach(form => {
            form.addEventListener('submit', handleSubmit)
        })

        return () => {
            forms.forEach(form => {
                form.removeEventListener('submit', handleSubmit)
            })
        }
    }, [])

    return { showBackToTop }
}

export default function App() {
    const { showBackToTop } = useDashboardEffects()

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    return <>
        <Header />

        <aside id="sidebar" className="sidebar">
        </aside>

        <main id="main" className="main">
        </main>

        <a
            href="#"
            className={`back-to-top d-flex align-items-center justify-content-center ${showBackToTop ? 'active' : ''}`}
            onClick={(e) => {
                e.preventDefault()
                scrollToTop()
            }}
        >
            <i className="bi bi-arrow-up-short"></i>
        </a>
    </>
    
}