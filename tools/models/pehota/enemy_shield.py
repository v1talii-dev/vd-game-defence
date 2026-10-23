"""Щитоносец: тяжёлая пехота с поднятым прямоугольным щитом впереди. Запуск: blender -b -P enemy_shield.py"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

b = Builder()
legs = {1: Builder(), -1: Builder()}  # sx=+1 — левая нога (персонаж смотрит в +Z), sx=-1 — правая
pants, boot, armor = hexc("#3c3a34"), hexc("#1c1a16"), hexc("#5b6068")
helm, skin, steel, amber = hexc("#4a4f57"), hexc("#c9996f"), hexc("#8d96a0"), hexc("#d9a43a")
for sx in (-1, 1):
    legs[sx].box((sx * .08, .10, 0), (.11, .20, .11), pants)
    legs[sx].box((sx * .08, .02, .02), (.12, .04, .15), boot)
    b.box((sx * .20, .39, 0), (.11, .08, .14), helm)  # наплечники
    b.box((sx * .19, .29, .06), (.07, .07, .16), armor)  # руки за щитом
b.box((0, .29, 0), (.34, .22, .17), armor)
b.box((0, .30, -.11), (.20, .15, .08), hexc("#2a2a28"))  # рюкзак
b.prism((0, .43, 0), .10, .06, skin, seg=6)
b.prism((0, .50, 0), .125, .08, helm, seg=6, r2=.09)
b.box((0, .47, .09), (.12, .03, .05), helm)  # козырёк
b.box((0, .33, .19), (.40, .38, .035), steel)  # щит: широкая пластина перед корпусом
b.box((0, .53, .19), (.42, .035, .07), helm)  # верхняя кромка: читается сверху
b.box((0, .33, .22), (.30, .05, .02), amber)  # полоса на щите
b.box((0, .33, .22), (.05, .30, .02), amber)
HIP_Y = .20
sh = group_shift([b, legs[1], legs[-1]])
export(b.finish("body", shift=sh), "enemy_shield", [
    (legs[1].finish("legL", shift=sh), "legL", (.08 + sh[0], HIP_Y + sh[1], sh[2])),
    (legs[-1].finish("legR", shift=sh), "legR", (-.08 + sh[0], HIP_Y + sh[1], sh[2])),
])
