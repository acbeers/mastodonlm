""" Make module loading work in a subdirectory """
import os
import sys

sys.path.append(os.path.dirname(__file__))
