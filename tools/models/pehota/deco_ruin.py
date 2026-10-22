"""Обломок стены из 4 боксов (≤80 треугольников)."""
import sys, os, math
sys.path.insert(0, os.path.dirname(__file__))
from common import *

b = Builder()
a, c, d = hexc("#a69272"), hexc("#8b7a5e"), hexc("#6f6250")
b.box((-.10, .26, 0), (.70, .52, .18), a, ry=.12)  # основной кусок стены
b.box((.30, .14, .10), (.28, .28, .18), c, ry=-.35)  # низкий огрызок
b.box((.18, .06, -.22), (.22, .12, .20), d, ry=.6)  # обломок на земле
b.box((-.38, .62, .02), (.22, .12, .16), c, ry=.3)  # торчащий верхний блок
export(b.finish("body"), "deco_ruin")
