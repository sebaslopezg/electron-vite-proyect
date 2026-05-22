export const menuItems = [
    { path: '/usuarios', label: 'Usuarios', icon: 'bi bi-people', permission: 'usuarios_gestionar' },
    { path: '/roles', label: 'Roles', icon: 'bi bi-shield-lock', permission: 'roles_gestionar' },
    { path: '/ventas', label: 'Ventas', icon: 'bi-receipt-cutoff', permission: 'ventas_crear' },
    { path: '/compras', label: 'Compras', icon: 'bi bi-cart4', permission: 'reportes_ver' },
    { path: '/clientes', label: 'Clientes', icon: 'bi-people', permission: 'ventas_crear' },
    { path: '/cartera', label: 'Cartera', icon: 'bi bi-wallet2 me-2', permission: 'reportes_ver' },
    { path: '/inventario', label: 'Inventario', icon: 'bi-clipboard-check', permission: 'inventario_ajustar' },
    { path: '/productos', label: 'Productos', icon: 'bi-box-seam', permission: 'productos_ver' },
    { path: '/encargos', label: 'Encargos', icon: 'bi-calendar-event', permission: 'ventas_crear' },
    { path: '/contabilidad', label: 'Contabilidad', icon: 'bi-calculator-fill', permission: 'reportes_ver' },
    { path: '/configuracion', label: 'Configuración', icon: 'bi-gear', permission: 'ventas_configurar' },
]