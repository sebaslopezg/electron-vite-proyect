import { useState, useEffect } from 'react';
import logo from './../../assets/favicon.png'

// Header Component with interactivity
export const Header = () => {
    const [searchBarShow, setSearchBarShow] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSidebarToggle = () => {
        document.body.classList.toggle('toggle-sidebar');
    };

    const handleSearchBarToggle = (e) => {
        e.preventDefault();
        setSearchBarShow(!searchBarShow);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        console.log('Searching for:', searchQuery);
        // Add your search logic here
    };

    return (
        <header id="header" className="header fixed-top d-flex align-items-center">
            <div className="d-flex align-items-center justify-content-between">
                <a href="index.html" className="logo d-flex align-items-center">
                    <img src={logo} alt="" />
                    <span className="d-none d-lg-block">Caedro</span>
                </a>
                <i 
                    className="bi bi-list toggle-sidebar-btn" 
                    onClick={handleSidebarToggle}
                    style={{ cursor: 'pointer' }}
                ></i>
            </div>

            <div className={`search-bar ${searchBarShow ? 'search-bar-show' : ''}`}>
                <div className="search-form d-flex align-items-center">
                    <input 
                        type="text" 
                        name="query" 
                        placeholder="Search" 
                        title="Enter search keyword"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch(e)}
                    />
                    <button type="button" title="Search" onClick={handleSearch}>
                        <i className="bi bi-search"></i>
                    </button>
                </div>
            </div>

            <nav className="header-nav ms-auto">
                <ul className="d-flex align-items-center">
                    <li className="nav-item d-block d-lg-none">
                        <a 
                            className="nav-link nav-icon search-bar-toggle" 
                            href="#"
                            onClick={handleSearchBarToggle}
                        >
                            <i className="bi bi-search"></i>
                        </a>
                    </li>

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

                    <li className="nav-item dropdown pe-3">
                        <a className="nav-link nav-profile d-flex align-items-center pe-0" href="#" data-bs-toggle="dropdown">
                            <img src="assets/img/profile-img.jpg" alt="Profile" className="rounded-circle" />
                            <span className="d-none d-md-block dropdown-toggle ps-2">K. Anderson</span>
                        </a>

                        <ul className="dropdown-menu dropdown-menu-end dropdown-menu-arrow profile">
                            <li className="dropdown-header">
                                <h6>Kevin Anderson</h6>
                                <span>Web Designer</span>
                            </li>
                            <li><hr className="dropdown-divider" /></li>

                            <li>
                                <a className="dropdown-item d-flex align-items-center" href="users-profile.html">
                                    <i className="bi bi-person"></i>
                                    <span>My Profile</span>
                                </a>
                            </li>
                            <li><hr className="dropdown-divider" /></li>

                            <li>
                                <a className="dropdown-item d-flex align-items-center" href="users-profile.html">
                                    <i className="bi bi-gear"></i>
                                    <span>Account Settings</span>
                                </a>
                            </li>
                            <li><hr className="dropdown-divider" /></li>

                            <li>
                                <a className="dropdown-item d-flex align-items-center" href="pages-faq.html">
                                    <i className="bi bi-question-circle"></i>
                                    <span>Need Help?</span>
                                </a>
                            </li>
                            <li><hr className="dropdown-divider" /></li>

                            <li>
                                <a className="dropdown-item d-flex align-items-center" href="#">
                                    <i className="bi bi-box-arrow-right"></i>
                                    <span>Sign Out</span>
                                </a>
                            </li>
                        </ul>
                    </li>
                </ul>
            </nav>
        </header>
    );
};

// Custom hook for dashboard functionality
export const useDashboardEffects = () => {
    const [showBackToTop, setShowBackToTop] = useState(false);

    // Scroll handlers
    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            
            // Header scrolled class
            const header = document.getElementById('header');
            if (header) {
                if (scrollY > 100) {
                    header.classList.add('header-scrolled');
                } else {
                    header.classList.remove('header-scrolled');
                }
            }

            // Back to top button
            setShowBackToTop(scrollY > 100);

            // Navbar links active state
            const navbarlinks = document.querySelectorAll('#navbar .scrollto');
            const position = scrollY + 200;
            
            navbarlinks.forEach(navbarlink => {
                if (!navbarlink.hash) return;
                const section = document.querySelector(navbarlink.hash);
                if (!section) return;
                
                if (position >= section.offsetTop && position <= (section.offsetTop + section.offsetHeight)) {
                    navbarlink.classList.add('active');
                } else {
                    navbarlink.classList.remove('active');
                }
            });
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll();

        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Initialize Bootstrap tooltips
    useEffect(() => {
        if (!window.bootstrap) return;

        const tooltipTriggerList = [].slice.call(
            document.querySelectorAll('[data-bs-toggle="tooltip"]')
        );
        
        const tooltipList = tooltipTriggerList.map(tooltipTriggerEl => {
            return new window.bootstrap.Tooltip(tooltipTriggerEl);
        });

        return () => {
            tooltipList.forEach(tooltip => tooltip.dispose());
        };
    }, []);

    // Initialize Quill editors
    useEffect(() => {
        if (!window.Quill) return;

        const editors = [];

        const defaultEditor = document.querySelector('.quill-editor-default');
        if (defaultEditor && !defaultEditor.classList.contains('ql-container')) {
            editors.push(new window.Quill(defaultEditor, { theme: 'snow' }));
        }

        const bubbleEditor = document.querySelector('.quill-editor-bubble');
        if (bubbleEditor && !bubbleEditor.classList.contains('ql-container')) {
            editors.push(new window.Quill(bubbleEditor, { theme: 'bubble' }));
        }

        const fullEditor = document.querySelector('.quill-editor-full');
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
            }));
        }
    }, []);

    // Initialize TinyMCE
    useEffect(() => {
        if (!window.tinymce) return;

        const useDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

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
            window.tinymce.remove();
        };
    }, []);

    // Initialize DataTables
    useEffect(() => {
        if (!window.simpleDatatables) return;

        const datatables = document.querySelectorAll('.datatable');
        const instances = [];

        datatables.forEach(datatable => {
            if (!datatable.classList.contains('dataTable-wrapper')) {
                const instance = new window.simpleDatatables.DataTable(datatable, {
                    perPageSelect: [5, 10, 15, ["All", -1]],
                    columns: [
                        { select: 2, sortSequence: ["desc", "asc"] },
                        { select: 3, sortSequence: ["desc"] },
                        { select: 4, cellClass: "green", headerClass: "red" }
                    ]
                });
                instances.push(instance);
            }
        });

        return () => {
            instances.forEach(instance => {
                if (instance && instance.destroy) {
                    instance.destroy();
                }
            });
        };
    }, []);

    // Initialize ECharts resize observer
    useEffect(() => {
        if (!window.echarts) return;

        const mainContainer = document.getElementById('main');
        if (!mainContainer) return;

        const resizeObserver = new ResizeObserver(() => {
            const echartElements = document.querySelectorAll('.echart');
            echartElements.forEach(element => {
                const instance = window.echarts.getInstanceByDom(element);
                if (instance) {
                    instance.resize();
                }
            });
        });

        const timer = setTimeout(() => {
            resizeObserver.observe(mainContainer);
        }, 200);

        return () => {
            clearTimeout(timer);
            resizeObserver.disconnect();
        };
    }, []);

    // Bootstrap form validation
    useEffect(() => {
        const forms = document.querySelectorAll('.needs-validation');

        const handleSubmit = (event) => {
            const form = event.target;
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        };

        forms.forEach(form => {
            form.addEventListener('submit', handleSubmit);
        });

        return () => {
            forms.forEach(form => {
                form.removeEventListener('submit', handleSubmit);
            });
        };
    }, []);

    return { showBackToTop };
};

// Main App Component
export default function App() {
    const { showBackToTop } = useDashboardEffects();

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <>
            <Header />

            <aside id="sidebar" className="sidebar">
                {/* Your sidebar content */}
            </aside>

            <main id="main" className="main">
                {/* Your dashboard content goes here */}
            </main>

            <a
                href="#"
                className={`back-to-top d-flex align-items-center justify-content-center ${showBackToTop ? 'active' : ''}`}
                onClick={(e) => {
                    e.preventDefault();
                    scrollToTop();
                }}
            >
                <i className="bi bi-arrow-up-short"></i>
            </a>
        </>
    );
}