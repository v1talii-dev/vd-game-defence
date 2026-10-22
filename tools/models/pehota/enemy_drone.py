"""Дрон: плоский ромбовидный корпус, 4 луча с дисками-винтами. Pivot — нижняя точка."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from common import *

b = Builder()
body, arm, disc, nose = hexc("#5b3f80"), hexc("#4a4a55"), hexc("#b9b0d4"), hexc("#e0b84a")
# нижний конус до точки (низ y=0), верхняя плоская крышка
b.prism((0, .05, 0), .01, .10, body, seg=4, r2=.20)
b.prism((0, .14, 0), .20, .08, body, seg=4, r2=.12)
b.box((0, .14, .20), (.08, .05, .10), nose)  # передний «сенсор» — направление
for sx in (-1, 1):
    for sz in (-1, 1):
        import math as m
        ry = m.atan2(sx, sz)
        b.box((sx * .12, .15, sz * .12), (.05, .04, .26), arm, ry=ry)
        b.box((sx * .22, .17, sz * .22), (.03, .05, .03), arm)
        b.prism((sx * .22, .20, sz * .22), .095, .02, disc, seg=8)
export(b.finish("body"), "enemy_drone")
