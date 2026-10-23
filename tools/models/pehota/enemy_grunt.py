"""Боевик-пехотинец: ноги, торс, рюкзак, шлем, руки, винтовка. Запуск: blender -b -P enemy_grunt.py"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

b = Builder()
legs = {1: Builder(), -1: Builder()}  # sx=+1 — левая нога (персонаж смотрит в +Z), sx=-1 — правая
pants, boot, shirt = hexc("#5a4a28"), hexc("#2b2418"), hexc("#7a6232")
helm, skin, gun, wood = hexc("#4d5a2a"), hexc("#d2a67c"), hexc("#1f1f22"), hexc("#6a4a2a")
for sx in (-1, 1):
    legs[sx].box((sx * .06, .10, 0), (.08, .20, .09), pants)
    legs[sx].box((sx * .06, .02, .02), (.09, .04, .13), boot)
    b.box((sx * .145, .30, .04), (.06, .06, .22), shirt)  # рука вперёд
b.box((0, .29, 0), (.22, .18, .12), shirt)
b.box((0, .30, -.09), (.14, .13, .07), hexc("#3a3322"))  # рюкзак
b.box((0, .405, .02), (.07, .03, .06), skin)  # шея
b.prism((0, .43, 0), .085, .06, skin, seg=6)
b.prism((0, .495, 0), .10, .06, helm, seg=6, r2=.07)
b.box((0, .46, .08), (.09, .03, .05), helm)  # козырёк
b.box((.07, .31, .16), (.045, .055, .30), wood)  # приклад/ложа
b.tube((.07, .32, .39), .018, .22, gun, seg=4)
b.box((.07, .35, .20), (.03, .03, .10), gun)  # оптика
HIP_Y = .20  # ось бедра: верх штанины
sh = group_shift([b, legs[1], legs[-1]])
export(b.finish("body", shift=sh), "enemy_grunt", [
    (legs[1].finish("legL", shift=sh), "legL", (.06 + sh[0], HIP_Y + sh[1], sh[2])),
    (legs[-1].finish("legR", shift=sh), "legR", (-.06 + sh[0], HIP_Y + sh[1], sh[2])),
])
