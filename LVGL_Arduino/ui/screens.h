#ifndef EEZ_LVGL_UI_SCREENS_H
#define EEZ_LVGL_UI_SCREENS_H

#include <lvgl.h>

#ifdef __cplusplus
extern "C" {
#endif

typedef struct _objects_t {
    lv_obj_t *main;
    lv_obj_t *halaman2;
    lv_obj_t *halaman3;
    lv_obj_t *halaman4;
    lv_obj_t *halaman5;
    lv_obj_t *obj0;
    lv_obj_t *connected_status;
    lv_obj_t *obj1;
    lv_obj_t *obj2;
    lv_obj_t *hr_lbl;
    lv_obj_t *sp2o_lbl;
    lv_obj_t *hr_v;
    lv_obj_t *sp2o_v;
    lv_obj_t *obj3;
    lv_obj_t *obj4;
    lv_obj_t *obj5;
    lv_obj_t *obj6;
    lv_obj_t *suhu_lbl_1;
    lv_obj_t *amb_lbl;
    lv_obj_t *suhu_v;
    lv_obj_t *amb_v;
    lv_obj_t *obj7;
    lv_obj_t *obj8;
    lv_obj_t *obj9;
    lv_obj_t *stres_lbl;
    lv_obj_t *obj10;
    lv_obj_t *gsr_label;
    lv_obj_t *stress_v;
    lv_obj_t *obj11;
    lv_obj_t *hr_lbl_2;
    lv_obj_t *obj12;
    lv_obj_t *g_force_lbl;
    lv_obj_t *activity_v;
} objects_t;

extern objects_t objects;

enum ScreensEnum {
    SCREEN_ID_MAIN = 1,
    SCREEN_ID_HALAMAN2 = 2,
    SCREEN_ID_HALAMAN3 = 3,
    SCREEN_ID_HALAMAN4 = 4,
    SCREEN_ID_HALAMAN5 = 5,
};

void create_screen_main();
void tick_screen_main();

void create_screen_halaman2();
void tick_screen_halaman2();

void create_screen_halaman3();
void tick_screen_halaman3();

void create_screen_halaman4();
void tick_screen_halaman4();

void create_screen_halaman5();
void tick_screen_halaman5();

void tick_screen_by_id(enum ScreensEnum screenId);
void tick_screen(int screen_index);

void create_screens();


#ifdef __cplusplus
}
#endif

#endif /*EEZ_LVGL_UI_SCREENS_H*/