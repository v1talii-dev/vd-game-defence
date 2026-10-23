"""Гренадёр: широкие плечи, гранатомёт-тубус на плече, тёмно-красная форма."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

b = Builder()
legs = {1: Builder(), -1: Builder()}  # sx=+1 — левая нога (персонаж смотрит в +Z), sx=-1 — правая
pants, boot, shirt = hexc("#3e2a22"), hexc("#1d1612"), hexc("#7a3a2c")
helm, skin, tube, band = hexc("#2d2020"), hexc("#c9996f"), hexc("#34363a"), hexc("#d9a43a")
for sx in (-1, 1):
    legs[sx].box((sx * .07, .10, 0), (.10, .20, .10), pants)
    legs[sx].box((sx * .07, .02, .02), (.11, .04, .14), boot)
    b.box((sx * .20, .39, 0), (.10, .07, .13), helm)  # наплечники
b.box((.17, .29, .06), (.06, .06, .20), shirt)  # правая рука (держит спереди)
b.box((-.17, .31, .0), (.06, .12, .06), shirt)  # левая придерживает тубус
b.box((0, .29, 0), (.32, .20, .15), shirt)
b.box((0, .30, -.10), (.18, .14, .08), hexc("#2a211c"))  # рюкзак с боезапасом
b.prism((0, .43, 0), .095, .06, skin, seg=6)
b.prism((0, .50, 0), .115, .07, helm, seg=6, r2=.08)
b.tube((-.17, .44, .07), .05, .46, tube, seg=6, r2=.065)  # тубус на левом плече
b.tube((-.17, .44, .31), .07, .05, band, seg=6, r2=.07)  # цветная полоса на дульном срезе
b.tube((-.17, .44, -.18), .075, .06, hexc("#161616"), seg=6, r2=.075)  # задний раструб
HIP_Y = .20  # ось бедра: верх штанины
sh = group_shift([b, legs[1], legs[-1]])
export(b.finish("body", shift=sh), "enemy_grenadier", [
    (legs[1].finish("legL", shift=sh), "legL", (.07 + sh[0], HIP_Y + sh[1], sh[2])),
    (legs[-1].finish("legR", shift=sh), "legR", (-.07 + sh[0], HIP_Y + sh[1], sh[2])),
])
