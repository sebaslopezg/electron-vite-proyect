import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom'
import { Header } from './Header';
import { Aside } from './Aside';
import { DashboardPage } from '../pages/DashboardPage';
import { Productos } from '../pages/Productos';

// Main Dashboard Component
function Dashboard() {

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
        if (typeof window !== 'undefined' && window.bootstrap) {
            const tooltipTriggerList = [].slice.call(
                document.querySelectorAll('[data-bs-toggle="tooltip"]')
            );
            
            const tooltipList = tooltipTriggerList.map(tooltipTriggerEl => {
                return new window.bootstrap.Tooltip(tooltipTriggerEl);
            });

            return () => {
                tooltipList.forEach(tooltip => tooltip.dispose());
            };
        }
    }, []);

    // Initialize Quill editors
    useEffect(() => {
        if (typeof window !== 'undefined' && window.Quill) {
            const defaultEditor = document.querySelector('.quill-editor-default');
            if (defaultEditor && !defaultEditor.classList.contains('ql-container')) {
                new window.Quill(defaultEditor, { theme: 'snow' });
            }

            const bubbleEditor = document.querySelector('.quill-editor-bubble');
            if (bubbleEditor && !bubbleEditor.classList.contains('ql-container')) {
                new window.Quill(bubbleEditor, { theme: 'bubble' });
            }

            const fullEditor = document.querySelector('.quill-editor-full');
            if (fullEditor && !fullEditor.classList.contains('ql-container')) {
                new window.Quill(fullEditor, {
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
                });
            }
        }
    }, []);

    // Initialize TinyMCE
    useEffect(() => {
        if (typeof window !== 'undefined' && window.tinymce) {
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
        }
    }, []);

    // Initialize DataTables
    useEffect(() => {
        if (typeof window !== 'undefined' && window.simpleDatatables) {
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
        }
    }, []);

    // Initialize ECharts resize observer
    useEffect(() => {
        if (typeof window !== 'undefined' && window.echarts) {
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
        }
    }, []);

    // Bootstrap form validation
    useEffect(() => {
        const forms = document.querySelectorAll('.needs-validation');

        const handleSubmit = (event) => {
            if (!event.target.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            event.target.classList.add('was-validated');
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

    const scrollToTop = (e) => {
        if (e) e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

  return <>
  
    <div>
        <Header />

        <aside id="sidebar" className="sidebar">
            <Aside />
        </aside>

        <main id="main" className="main">
            <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/productos" element={<Productos />} />
            </Routes>
        </main>

        {showBackToTop && (
            <a
                href="#"
                className="back-to-top d-flex align-items-center justify-content-center"
                style={{ display: showBackToTop ? 'flex' : 'none' }}
                onClick={scrollToTop}
            >
                <i className="bi bi-arrow-up-short"></i>
            </a>
        )}
    </div>

  </>
}

export default Dashboard;