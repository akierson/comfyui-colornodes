# Copyright 2024 A Kierson
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to
# deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
# and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.

from PIL import Image, ImageOps, ImageChops
import numpy as np
import torch


def hex_to_rgb(hex_color: str, bgr: bool = False):
    hex_color = hex_color.lstrip("#")
    if bgr:
        return tuple(int(hex_color[i : i + 2], 16) for i in (4, 2, 0))

    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))

class ColorPicker:
    """Color Primitive"""

    def __init__(self) -> None:
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "color": ("COLOR",),
            },
        }

    CATEGORY = "utils/color"
    RETURN_TYPES = ("COLOR",)
    RETURN_NAMES = ("color",)

    FUNCTION = "colorpicker"

    def colorpicker(self, color):
        return (color,)


class HexToRGB:
    """Hex to RGB"""

    def __init__(self) -> None:
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "string": ("STRING",),
            },
        }

    CATEGORY = "utils/color"
    RETURN_TYPES = ("INT","INT","INT",)
    RETURN_NAMES = ("R","G","B",)

    FUNCTION = "execute"

    def execute(self, color):
        return hex_to_rgb(color)
    
class ColorToRGB:
    """Color to RGB"""

    def __init__(self) -> None:
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "color": ("COLOR",),
            },
        }

    CATEGORY = "utils/color"
    RETURN_TYPES = ("INT","INT","INT",)
    RETURN_NAMES = ("R","G","B",)

    FUNCTION = "execute"

    def execute(self, color):
        return hex_to_rgb(color)

class ColorToHex:
    """Color To HEX"""

    def __init__(self) -> None:
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "color": ("COLOR",),
            },
        }

    CATEGORY = "utils/color"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("hex_string",)

    FUNCTION = "execute"

    def execute(self, color):
        return (color,)

class InvertColor:
    """Returns to inverse of a color"""

    def __init__(self) -> None:
        pass

    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "color": ("COLOR",),
            },
        }

    CATEGORY = "utils/color"
    RETURN_TYPES = ("COLOR",)
    RETURN_NAMES = ("color",)

    FUNCTION = "execute"

    def execute(self, color):
        color = color.lstrip("#")
        table = str.maketrans('0123456789abcdef', 'fedcba9876543210')
        return ('#' + color.lower().translate(table),)
    
# IMAGE REMOVE COLOR
# By WASasquatch (Discord: WAS#0263)
#
# Copyright 2023 Jordan Thompson (WASasquatch)
#
# Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to
# deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
# and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
#
# The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
#
# THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
# THE SOFTWARE.

# Tensor to PIL
def tensor2pil(image):
    return Image.fromarray(np.clip(255. * image.cpu().numpy().squeeze(), 0, 255).astype(np.uint8))

# PIL to Tensor
def pil2tensor(image):
    return torch.from_numpy(np.array(image).astype(np.float32) / 255.0).unsqueeze(0)

class ImageReplaceColor:
    """Replace Color in an Image"""
    def __init__(self):
        pass

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
                "target_color": ("COLOR",),
                "replace_color": ("COLOR",),
                "clip_threshold": ("INT", {"default": 10, "min": 0, "max": 255, "step": 1}),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "image_remove_color"

    CATEGORY = "Image/Process"

    def image_remove_color(self, image, clip_threshold=10, target_color='#ffffff',replace_color='#ffffff'):
        return (pil2tensor(self.apply_remove_color(tensor2pil(image), clip_threshold, hex_to_rgb(target_color), hex_to_rgb(replace_color))), )

    def apply_remove_color(self, image, threshold=10, color=(255, 255, 255), rep_color=(0, 0, 0)):
        # Create a color image with the same size as the input image
        color_image = Image.new('RGB', image.size, color)

        # Calculate the difference between the input image and the color image
        diff_image = ImageChops.difference(image, color_image)

        # Convert the difference image to grayscale
        gray_image = diff_image.convert('L')

        # Apply a threshold to the grayscale difference image
        mask_image = gray_image.point(lambda x: 255 if x > threshold else 0)

        # Invert the mask image
        mask_image = ImageOps.invert(mask_image)

        # Apply the mask to the original image
        result_image = Image.composite(
            Image.new('RGB', image.size, rep_color), image, mask_image)

        return result_image

# color swatches

NODE_CLASS_MAPPINGS = {
    "Color Picker": ColorPicker,
    "Color to RGB": ColorToRGB,
    "Color to Hex": ColorToHex,
    "Image Replace Color": ImageReplaceColor,
    "Invert Color": InvertColor,
}