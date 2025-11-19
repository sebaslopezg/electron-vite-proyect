import { useEffect, useRef, useState } from 'react';

// Main Dashboard Component
function Dashboard() {
  const [sidebarToggled, setSidebarToggled] = useState(false);
  const [searchBarShow, setSearchBarShow] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  
  const headerRef = useRef(null);
  const mainRef = useRef(null);

  // Sidebar toggle handler
  const handleSidebarToggle = () => {
    setSidebarToggled(!sidebarToggled);
  };

  // Search bar toggle handler
  const handleSearchBarToggle = () => {
    setSearchBarShow(!searchBarShow);
  };

  // Scroll handlers
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      // Header scrolled class
      if (headerRef.current) {
        if (scrollY > 100) {
          headerRef.current.classList.add('header-scrolled');
        } else {
          headerRef.current.classList.remove('header-scrolled');
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
    handleScroll(); // Initial call

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Initialize Bootstrap tooltips
  useEffect(() => {
    const tooltipTriggerList = [].slice.call(
      document.querySelectorAll('[data-bs-toggle="tooltip"]')
    );
    
    const tooltipList = tooltipTriggerList.map(tooltipTriggerEl => {
      return new window.bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Cleanup
    return () => {
      tooltipList.forEach(tooltip => tooltip.dispose());
    };
  }, []);

  // Initialize Quill editors
  useEffect(() => {
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

    return () => {
      editors.forEach(editor => {
        if (editor && editor.container) {
          editor.container.innerHTML = '';
        }
      });
    };
  }, []);

  // Initialize TinyMCE
  useEffect(() => {
    const useDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (window.tinymce) {
      window.tinymce.init({
        selector: 'textarea.tinymce-editor',
        plugins: 'preview importcss searchreplace autolink autosave save directionality code visualblocks visualchars fullscreen image link media codesample table charmap pagebreak nonbreaking anchor insertdatetime advlist lists wordcount help charmap quickbars emoticons accordion',
        menubar: 'file edit view insert format tools table help',
        toolbar: "undo redo | accordion accordionremove | blocks fontfamily fontsize | bold italic underline strikethrough | align numlist bullist | link image | table media | lineheight outdent indent| forecolor backcolor removeformat | charmap emoticons | code fullscreen preview | save print | pagebreak anchor codesample | ltr rtl",
        height: 600,
        skin: useDarkMode ? 'oxide-dark' : 'oxide',
        content_css: useDarkMode ? 'dark' : 'default',
      });
    }

    return () => {
      if (window.tinymce) {
        window.tinymce.remove();
      }
    };
  }, []);

  // Initialize DataTables
  useEffect(() => {
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
    if (!mainRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      const echartElements = document.querySelectorAll('.echart');
      echartElements.forEach(element => {
        const instance = window.echarts?.getInstanceByDom(element);
        if (instance) {
          instance.resize();
        }
      });
    });

    const timer = setTimeout(() => {
      resizeObserver.observe(mainRef.current);
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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={sidebarToggled ? 'toggle-sidebar' : ''}>
      {/* Header */}
      <header id="header" ref={headerRef}>
        <button className="toggle-sidebar-btn" onClick={handleSidebarToggle}>
          <i className="bi bi-list"></i>
        </button>
        <button className="search-bar-toggle" onClick={handleSearchBarToggle}>
          <i className="bi bi-search"></i>
        </button>
        <div className={`search-bar ${searchBarShow ? 'search-bar-show' : ''}`}>
          {/* Search bar content */}
        </div>
      </header>

      {/* Main Content */}
      <main id="main" ref={mainRef}>
        {/* Your dashboard content goes here */}
      </main>

      {/* Back to top button */}
      <button
        className={`back-to-top ${showBackToTop ? 'active' : ''}`}
        onClick={scrollToTop}
      >
        <i className="bi bi-arrow-up-short"></i>
      </button>
    </div>
  );
}

export default Dashboard;