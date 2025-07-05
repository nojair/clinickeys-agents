DELIMITER $$

CREATE PROCEDURE generar_notificaciones_para_fecha(IN p_fecha DATE)
BEGIN
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_id_cita BIGINT;
    DECLARE cur CURSOR FOR
        SELECT id_cita FROM citas
        WHERE fecha_cita = p_fecha;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_id_cita;
        IF done THEN
            LEAVE read_loop;
        END IF;

        BEGIN
            DECLARE CONTINUE HANDLER FOR SQLEXCEPTION BEGIN END;
            CALL generar_notificacion_por_cita(v_id_cita);
        END;
    END LOOP;

    CLOSE cur;
END$$

DELIMITER ;