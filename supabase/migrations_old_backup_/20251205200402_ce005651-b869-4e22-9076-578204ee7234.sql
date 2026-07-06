-- Remover o trigger de desativação já que agora usamos exclusão permanente
DROP TRIGGER IF EXISTS trigger_check_cmei_deactivate ON cmeis;
DROP FUNCTION IF EXISTS check_cmei_can_deactivate();