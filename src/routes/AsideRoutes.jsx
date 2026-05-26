export const menuItems = [
    { path: '/usuarios', label: 'Usuarios', icon: 'bi bi-people', permission: 'usuarios_gestionar' },
    { path: '/roles', label: 'Roles', icon: 'bi bi-shield-lock', permission: 'roles_gestionar' },
    { path: '/ventas', label: 'Ventas', icon: 'bi-receipt-cutoff', permission: 'ventas_crear' },
    { path: '/compras', label: 'Compras', icon: 'bi bi-cart4', permission: 'compras_ver' },
    { path: '/clientes', label: 'Clientes', icon: 'bi-people', permission: 'clientes_ver' },
    { path: '/cartera', label: 'Cartera', icon: 'bi bi-wallet2 me-2', permission: 'cartera_ver' },
    { path: '/inventario', label: 'Inventario', icon: 'bi-clipboard-check', permission: 'inventario_ver' },
    { path: '/productos', label: 'Productos', icon: 'bi-box-seam', permission: 'productos_ver' },
    { path: '/encargos', label: 'Encargos', icon: 'bi-calendar-event', permission: 'encargos_ver' },
    { path: '/contabilidad', label: 'Contabilidad', icon: 'bi-calculator-fill', permission: 'contabilidad_ver' },
    { path: '/configuracion', label: 'Configuración', icon: 'bi-gear', permission: 'configuracion_sistema' },
]