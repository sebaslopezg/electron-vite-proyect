import { ipcMain } from "electron";
import { v4 as uuidv4 } from 'uuid';
import db from "../database/index.js";

export const registerNotasHandlers = () => {

  ipcMain.handle("get-notas", () => {
    try {
      // Ahora hacemos JOIN con ventasMaestro
      const stmt = db.prepare(`
        SELECT 
          n.*,
          v.prefijo AS prefijo_factura,
          v.numero_factura
        FROM nota n
        LEFT JOIN ventasMaestro v ON n.id_factura_origen = v.id
        ORDER BY n.date_created DESC
      `);
      return stmt.all();
    } catch (error) {
      console.error("Error obteniendo notas:", error);
      return [];
    }
  });

  // 2. CREATE NOTA (The Complex Transaction)
  ipcMain.handle("add-nota", (_, data) => {
    // We define the transaction block first
    const createNotaTransaction = db.transaction((notaData) => {
      const now = new Date().toISOString();
      const notaId = uuidv4();
      const currentUser = notaData.usuario || 'system';

      // --- STEP A: Insert the Master Record (Header) ---
      const insertNota = db.prepare(`
        INSERT INTO nota (
          id, tipo_nota, prefijo, numero_nota, id_factura_origen, 
          numero_factura_origen, documento_cliente, nombre_cliente, motivo_dian, observaciones, 
          total_base, total_iva, total_final, status, date_created, date_modify, modify_by
        ) VALUES (
          @id, @tipo_nota, @prefijo, @numero_nota, @id_factura_origen, 
          @numero_factura_origen, @documento_cliente, @nombre_cliente, @motivo_dian, @observaciones, 
          @total_base, @total_iva, @total_final, 1, @now, @now, @usuario
        )
      `);

      insertNota.run({
        id: notaId,
        tipo_nota: notaData.tipo_nota,
        prefijo: notaData.prefijo,
        numero_nota: notaData.numero_nota,
        id_factura_origen: notaData.id_factura_origen,
        numero_factura_origen: notaData.numero_factura_origen,
        
        // CAMBIOS AQUÍ:
        documento_cliente: notaData.documento_cliente || '',
        nombre_cliente: notaData.nombre_cliente || '',
        
        motivo_dian: notaData.motivo_dian,
        observaciones: notaData.observaciones || '',
        total_base: notaData.total_base,
        total_iva: notaData.total_iva,
        total_final: notaData.total_final,
        now: now,
        usuario: currentUser
      });

      // Prepare statements for the loop to maximize performance
      const insertItem = db.prepare(`
        INSERT INTO nota_item (
          id, id_nota, id_producto, nombre_producto, cantidad, 
          precio_unitario, iva_percent, subtotal, total
        ) VALUES (
          @id, @id_nota, @id_producto, @nombre_producto, @cantidad, 
          @precio_unitario, @iva_percent, @subtotal, @total
        )
      `);

      const getStock = db.prepare(`SELECT stock FROM producto WHERE id = ?`);
      const updateStock = db.prepare(`UPDATE producto SET stock = @stock, date_modify = @now WHERE id = @id`);
      
      const insertInventario = db.prepare(`
        INSERT INTO inventario (
          id, producto_id, tipo_movimiento, modulo_movimiento, cantidad, 
          stock_anterior, stock_nuevo, fecha, usuario, notas
        ) VALUES (
          @id, @producto_id, @tipo_movimiento, @modulo_movimiento, @cantidad, 
          @stock_anterior, @stock_nuevo, @fecha, @usuario, @notas
        )
      `);

      // --- STEP B: Loop through Items ---
      for (const item of notaData.items) {
        // 1. Insert Note Detail
        insertItem.run({
          id: uuidv4(),
          id_nota: notaId,
          id_producto: item.id_producto,
          nombre_producto: item.nombre_producto,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          iva_percent: item.iva_percent,
          subtotal: item.subtotal,
          total: item.total
        });

        // 2. Handle Inventory Logic (Only if it's a physical return)
        // If the user specifies this note returns items to stock (e.g., Devolution)
        if (notaData.afecta_inventario) {
          const currentProduct = getStock.get(item.id_producto);
          
          if (currentProduct) {
            const stockAnterior = currentProduct.stock;
            // If Credit Note (Devolution), stock goes UP. If Debit (Correction), it might go DOWN.
            // Assuming Credit Note = items returned to store:
            const stockNuevo = notaData.tipo_nota === 'Crédito' 
              ? stockAnterior + item.cantidad 
              : stockAnterior - item.cantidad;

            // Update Product
            updateStock.run({ stock: stockNuevo, now: now, id: item.id_producto });

            // Log in Inventario table
            insertInventario.run({
              id: uuidv4(),
              producto_id: item.id_producto,
              tipo_movimiento: notaData.tipo_nota === 'Crédito' ? 'ingreso' : 'egreso',
              modulo_movimiento: 'notas_credito_debito',
              cantidad: item.cantidad,
              stock_anterior: stockAnterior,
              stock_nuevo: stockNuevo,
              fecha: now,
              usuario: currentUser,
              notas: `Asociado a Nota ${notaData.prefijo}-${notaData.numero_nota}`
            });
          }
        }
      }

      return notaId; // Return the new ID if everything succeeded
    });

    // Execute the transaction
    try {
      const newNotaId = createNotaTransaction(data);
      return { success: true, id: newNotaId };
    } catch (error) {
      console.error("Error en transacción de Nota:", error);
      // better-sqlite3 automatically rolls back changes if an error is thrown inside the transaction!
      return { success: false, error: error.message };
    }
  });

ipcMain.handle("search-factura", (_, numero_factura) => {
    try {
      // 1. Buscar el encabezado de la factura
      const maestro = db.prepare('SELECT * FROM ventasMaestro WHERE numero_factura = ?').get(numero_factura);
      
      if (!maestro) {
        return { success: false, message: 'Factura no encontrada' };
      }

      // 2. Buscar los productos de esa factura
      const detalles = db.prepare('SELECT * FROM ventasDetalle WHERE maestro_id = ?').all(maestro.id);
      
      return { success: true, maestro, detalles };
    } catch (error) {
      console.error("Error buscando factura:", error);
      return { success: false, error: error.message };
    }
  });

};