export const ESQUEMA_SEGURIDAD = [
    { 
        id: 'mod_ventas', 
        nombre: 'Ventas', 
        icono: 'bi-receipt-cutoff', 
        path: '/ventas', 
        submodulos: [
            { 
                id: 'ventas_crear', 
                label: 'Facturación' 
            }, 
            { 
                id: 'ventas_historial', 
                label: 'Ver Facturas', 
                permisos_hijos: [
                    { 
                        id: 'ventas_imprimir', 
                        label: 'Permitir re-imprimir tirillas o formatos de facturas' 
                    }
                ] 
            }, 
            { 
                id: 'reportes_ver', 
                label: 'Reportes y Métricas' 
            }, 
            { 
                id: 'notas_gestionar', 
                label: 'Gestión de Notas de Ajuste (Crédito y Débito)' 
            }, 
            { 
                id: 'ventas_configurar', 
                label: 'Configurar módulo' 
            }
        ] 
    },
    { 
        id: 'mod_productos', 
        nombre: 'Productos y Servicios', 
        icono: 'bi-box-seam', 
        path: '/productos', 
        submodulos: [
            { 
                id: 'productos_ver', 
                label: 'Ver productos' 
            }, 
            { 
                id: 'productos_gestionar', 
                label: 'Crear, actualizar o eliminar registros del catálogo' 
            }, 
            { 
                id: 'categorias_gestionar', 
                label: 'Administrar taxonomías (Categorías, Subcategorías y Etiquetas)' 
            }
        ] 
    },
    { 
        id: 'mod_inventario', 
        nombre: 'Inventario (Kárdex)', 
        icono: 'bi-clipboard-check', 
        path: '/inventario', 
        submodulos: [
            { 
                id: 'inventario_ver', 
                label: 'Ver inventario' 
            }, 
            { 
                id: 'inventario_ajustar', 
                label: 'Realizar ajustes manuales directos sobre el stock' 
            }
        ] 
    },
    { 
        id: 'mod_compras', 
        nombre: 'Compras y Gastos', 
        icono: 'bi-cart4', 
        path: '/compras', 
        submodulos: [
            { 
                id: 'compras_ver', 
                label: 'Ver detalles de compras' 
            }, 
            { 
                id: 'compras_crear', 
                label: 'Crear compras' 
            }
        ] 
    },
    { 
        id: 'mod_clientes', 
        nombre: 'Clientes y Terceros', 
        icono: 'bi-people', 
        path: '/clientes', 
        submodulos: [
            { 
                id: 'clientes_ver', 
                label: 'Ver clientes (terceros)' 
            }, 
            { 
                id: 'clientes_crear', 
                label: 'Crear clientes (terceros)' 
            }, 
            { 
                id: 'clientes_editar', 
                label: 'Modificar clientes' 
            }, 
            { 
                id: 'clientes_eliminar', 
                label: 'Eliminar clientes' 
            }
        ] 
    },
    { 
        id: 'mod_cartera', 
        nombre: 'Cartera y Cobranzas', 
        icono: 'bi-wallet2', 
        path: '/cartera', 
        submodulos: [
            { 
                id: 'cartera_ver', 
                label: 'Consultar cartera' 
            }, 
            { 
                id: 'cartera_abonos_ver', 
                label: 'Ver abonos', 
                permisos_hijos: [
                    { 
                        id: 'cartera_abonar', 
                        label: 'Realizar nuevos abonos' 
                    }
                ] 
            }, 
            { 
                id: 'cartera_historial_ver', 
                label: 'Ver historial de cartera', 
                permisos_hijos: [
                    { 
                        id: 'cartera_abono_imprimir', 
                        label: 'Imprimir comprobantes' 
                    }
                ] 
            }
        ] 
    },
    { 
        id: 'mod_encargos', 
        nombre: 'Encargos y Apartados', 
        icono: 'bi-calendar-event', 
        path: '/encargos', 
        submodulos: [
            { 
                id: 'encargos_ver', 
                label: 'Ver encargos' 
            }, 
            { 
                id: 'encargos_gestionar', 
                label: 'Gestionar encargos' 
            }
        ] 
    },
    { 
        id: 'mod_contabilidad', 
        nombre: 'Contabilidad Integral (NIIF)', 
        icono: 'bi-calculator-fill', 
        path: '/contabilidad', 
        submodulos: [
            { 
                id: 'puc_ver', 
                label: 'Plan Único de Cuentas (PUC)', 
                permisos_hijos: [
                    { 
                        id: 'puc_crear', 
                        label: 'Crear cuentas contables' 
                    }, 
                    { 
                        id: 'puc_editar', 
                        label: 'Modificar cuentas contables' 
                    }, 
                    { 
                        id: 'puc_eliminar', 
                        label: 'Eliminar cuentas contables' 
                    }
                ] 
            }, 
            { 
                id: 'terceros_ver', 
                label: 'Directorio de Terceros', 
                permisos_hijos: [
                    { 
                        id: 'terceros_crear', 
                        label: 'Crear terceros' 
                    }, 
                    { 
                        id: 'terceros_editar', 
                        label: 'Modificar terceros' 
                    }, 
                    { 
                        id: 'terceros_eliminar', 
                        label: 'Eliminar terceros' 
                    }
                ] 
            }, 
            { 
                id: 'comprobantes_ver', 
                label: 'Comprobantes', 
                permisos_hijos: [
                    { 
                        id: 'comprobantes_crear', 
                        label: 'Crear asiento contable manual' 
                    }, 
                    { 
                        id: 'comprobantes_editar', 
                        label: 'Modificar/Corregir asientos contables existentes' 
                    }
                ] 
            }, 
            { 
                id: 'contabilidad_reportes_ver', 
                label: 'Reportes Financieros' 
            }, 
            { 
                id: 'contabilidad_config_ver', 
                label: 'Configuración Contable (Visualizar módulo de enlaces automáticos)', 
                permisos_hijos: [
                    { 
                        id: 'config_cuentas_ventas', 
                        label: 'Configurar cuentas en ventas' 
                    }, 
                    { 
                        id: 'config_cuentas_compras', 
                        label: 'Configurar cuentas en compras y gastos' 
                    }, 
                    { 
                        id: 'config_metodos_pago', 
                        label: 'Configurar cuentas en métodos de pago' 
                    }
                ] 
            }
        ] 
    },
    { 
        id: 'mod_usuarios', 
        nombre: 'Usuarios del Sistema', 
        icono: 'bi-person-badge', 
        path: '/usuarios', 
        submodulos: [
            { 
                id: 'usuarios_crear', 
                label: 'Crear usuarios' 
            }, 
            { 
                id: 'usuarios_editar', 
                label: 'Modificar usuarios' 
            }, 
            { 
                id: 'usuarios_eliminar', 
                label: 'Eliminar usuarios' 
            }
        ]
    },
    {
        id: 'mod_roles',
        nombre: 'Roles y Privilegios',
        icono: 'bi-shield-lock',
        path: '/roles',
        submodulos: [
            {
                id: 'roles_crear',
                label: 'Crear roles'
            }, 
            {
                id: 'roles_editar',
                label: 'Modificar roles'
            },
            {
                id: 'roles_eliminar',
                label: 'Eliminar roles'
            }
        ]
    },
    { 
        id: 'mod_configuracion', 
        nombre: 'Configuración Global', 
        icono: 'bi-gear', 
        path: '/configuracion', 
        submodulos: [
            { 
                id: 'configuracion_general', 
                label: 'Configuración general' 
            }, 
            { 
                id: 'ver_logs', 
                label: 'Ver logs' 
            }, 
            { 
                id: 'manejo_datos', 
                label: 'Manejo de datos', 
                permisos_hijos: [
                    { 
                        id: 'datos_perfiles_crear', 
                        label: 'Crear perfiles de datos' 
                    }, 
                    { 
                        id: 'datos_perfiles_cambiar', 
                        label: 'Cambiar de perfil' 
                    }, 
                    { 
                        id: 'datos_perfiles_eliminar', 
                        label: '⚠️ Eliminar perfiles (No recomendado)' 
                    }, 
                    { 
                        id: 'datos_info_ver', 
                        label: 'Ver información de datos' 
                    }, 
                    { 
                        id: 'datos_tablas_ver', 
                        label: 'Ver contenido de tablas de datos' 
                    }, 
                    { 
                        id: 'datos_tablas_vaciar', 
                        label: '⚠️ Vaciar tablas de datos (No recomendado)' 
                    }
                ] 
            }, 
            { 
                id: 'importar_datos', 
                label: 'Importar datos (CSV / SQL / Relacional)'
            }, 
            { 
                id: 'exportar_datos', 
                label: 'Exportar datos (Respaldos de seguridad)'
            }
        ] 
    }
]