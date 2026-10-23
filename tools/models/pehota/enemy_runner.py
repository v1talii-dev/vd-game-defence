"""Бегун: стройная лёгкая пехота, наклон вперёд, красная повязка. Запуск: blender -b -P enemy_runner.py"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

b = Builder()
legs = {1: Builder(), -1: Builder()}  # sx=+1 — левая нога (персонаж смотрит в +Z), sx=-1 — правая
pants, boot, shirt = hexc("#4a4036"), hexc("#241d16"), hexc("#8a6a3e")
skin, band, hair = hexc("#d2a67c"), hexc("#c23a2a"), hexc("#2a2018")
for sx in (-1, 1):
    legs[sx].box((sx * .05, .10, .0), (.07, .20, .08), pants)
    legs[sx].box((sx * .05, .02, .03), (.08, .04, .13), boot)
    b.box((sx * .115, .29, .09), (.045, .05, .20), shirt)  # руки вперёд-вниз, в наклоне
b.box((0, .26, .02), (.16, .12, .11), shirt)  # низ торса
b.box((0, .33, .06), (.17, .10, .11), shirt)  # верх торса сдвинут вперёд: наклон
b.box((0, .39, .09), (.06, .03, .05), skin)  # шея
b.prism((0, .43, .11), .075, .06, skin, seg=6)
b.prism((0, .475, .11), .08, .035, hair, seg=6, r2=.06)
b.prism((0, .445, .11), .088, .02, band, seg=6)  # повязка
b.box((0, .445, .035), (.03, .03, .07), band)  # хвост повязки назад
HIP_Y = .20
sh = group_shift([b, legs[1], legs[-1]])
export(b.finish("body", shift=sh), "enemy_runner", [
    (legs[1].finish("legL", shift=sh), "legL", (.05 + sh[0], HIP_Y + sh[1], sh[2])),
    (legs[-1].finish("legR", shift=sh), "legR", (-.05 + sh[0], HIP_Y + sh[1], sh[2])),
])
