import { supabase } from '../services/supabaseService.js';
import { logger } from '../utils/logger.js';

export const listStores = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        message: '사용자 인증이 필요합니다' 
      });
    }

    const { data, error } = await supabase
      .from('user_stores')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    res.json({ 
      success: true, 
      data: data || [],
      count: data ? data.length : 0
    });
  } catch(e){ 
    logger.error('스토어 목록 조회 에러:', e);
    next(e); 
  }
};

export const getStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: '스토어 ID가 필요합니다' 
      });
    }

    // UUID 형식 검증
    if (!isValidUUID(id)) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 스토어 ID 형식입니다' 
      });
    }

    const { data, error } = await supabase
      .from('user_stores')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId) // 본인의 스토어만 조회 가능
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ 
          success: false, 
          message: '스토어를 찾을 수 없습니다' 
        });
      }
      throw error;
    }

    res.json({ success: true, data });
  } catch(e){ 
    logger.error('스토어 조회 에러:', e);
    next(e); 
  }
};

export const createStore = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { store_name, address, road_address, phone, category, coordinates_x, coordinates_y, place_id, map_url, is_primary } = req.body;

    if (!store_name || !address) {
      return res.status(400).json({ 
        success: false, 
        message: '스토어명과 주소는 필수입니다' 
      });
    }

    const desiredPrimary = (typeof is_primary === 'boolean') ? is_primary : true;

    // 다른 primary 비활성화 (요청이 primary인 경우)
    if (desiredPrimary) {
      const { error: unsetErr } = await supabase
        .from('user_stores')
        .update({ is_primary: false })
        .eq('user_id', userId);
      if (unsetErr) throw unsetErr;
    }

    const payload = { 
      user_id: userId,
      store_name,
      address,
      road_address,
      phone,
      category,
      coordinates_x,
      coordinates_y,
      place_id,
      map_url,
      is_primary: desiredPrimary,
      extracted_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('user_stores')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    
    logger.info(`새 스토어 생성: ${data.id} (${data.store_name}), is_primary: ${data.is_primary}`);
    res.status(201).json({ success: true, data });
  } catch(e){ 
    logger.error('스토어 생성 에러:', e);
    next(e); 
  }
};

export const updateStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: '스토어 ID가 필요합니다' 
      });
    }

    // UUID 형식 검증
    if (!isValidUUID(id)) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 스토어 ID 형식입니다' 
      });
    }

    // 본인의 스토어인지 확인
    const { data: existingStore, error: checkError } = await supabase
      .from('user_stores')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingStore) {
      return res.status(404).json({ 
        success: false, 
        message: '수정할 수 있는 스토어가 없습니다' 
      });
    }

    const patch = { 
      ...updateData, 
      updated_at: new Date().toISOString() 
    };

    const { data, error } = await supabase
      .from('user_stores')
      .update(patch)
      .eq('id', id)
      .eq('user_id', userId) // 본인의 스토어만 수정 가능
      .select()
      .single();

    if (error) throw error;
    
    logger.info(`스토어 수정: ${id}`);
    res.json({ success: true, data });
  } catch(e){ 
    logger.error('스토어 수정 에러:', e);
    next(e); 
  }
};

export const deleteStore = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: '스토어 ID가 필요합니다' 
      });
    }

    // UUID 형식 검증
    if (!isValidUUID(id)) {
      return res.status(400).json({ 
        success: false, 
        message: '유효하지 않은 스토어 ID 형식입니다' 
      });
    }

    // 본인의 스토어인지 확인
    const { data: existingStore, error: checkError } = await supabase
      .from('user_stores')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (checkError || !existingStore) {
      return res.status(404).json({ 
        success: false, 
        message: '삭제할 수 있는 스토어가 없습니다' 
      });
    }

    const { error } = await supabase
      .from('user_stores')
      .delete()
      .eq('id', id)
      .eq('user_id', userId); // 본인의 스토어만 삭제 가능

    if (error) throw error;
    
    logger.info(`스토어 삭제: ${id}`);
    res.json({ success: true, message: '스토어가 삭제되었습니다' });
  } catch(e){ 
    logger.error('스토어 삭제 에러:', e);
    next(e); 
  }
};

// UUID 형식 검증 함수
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

