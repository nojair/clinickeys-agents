DELIMITER $$

CREATE PROCEDURE generar_notificaciones_desde_fecha(IN p_fecha DATE)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id_cita BIGINT;
    -- Seleccionamos todas las citas a partir de la fecha dada
    DECLARE cur CURSOR FOR
        SELECT id_cita
        FROM citas
        WHERE fecha_cita >= p_fecha;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;

    lectura_loop: LOOP
        FETCH cur INTO v_id_cita;
        IF done THEN
            LEAVE lectura_loop;
        END IF;

        -- Envolvemos la llamada en un handler para seguir con la siguiente cita si hay error
        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
            CALL generar_notificacion_por_cita(v_id_cita);
        END;
    END LOOP;

    CLOSE cur;
END$$

DELIMITER ;


CALL generar_notificaciones_desde_fecha('2025-05-28');