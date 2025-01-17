import { useCursor } from "@react-three/drei";
import { Color, Vector3 } from "@react-three/fiber";
import { useState, useMemo, Ref, ChangeEvent, forwardRef } from "react";
import Label, { LabelProps } from "./Label";
import Text from "./Text";
import { Euler } from "three";

export type TroikaTextProps = {
  color?: Color;
  fontSize?: number;
  letterSpacing?: number;
  font?: string;
  depthOffset?: number;
  outlineWidth?: number | string;
  outlineOffsetX?: number | string;
  outlineOffsetY?: number | string;
  outlineBlur?: number | string;
  outlineColor?: Color;
  outlineOpacity?: number;
  strokeWidth?: number | string;
  strokeColor?: Color;
  strokeOpacity?: number;
  fillOpacity?: number;
  onSync?: (troika: any) => void;
};

type Props = {
  /**
   * Optional ChangeEventHandler that is called when the <input> element changes.
   * Usually used to get the input's text value for form submission.
   *
   * @example
   * // log out the input's text value
   * <Input onChange={(e: ChangeEvent) => { console.log(e.target.value) }} />
   */
  onChange?: (e: ChangeEvent) => void;

  /** setting this to password will mask the characters with dots */
  type?: "text" | "password";

  /**
   * Props to pass to the underlying troika-three-text instance
   *
   * Most -- but not all -- of the props for troika-three-text are supported:
   * https://github.com/protectwise/troika/tree/master/packages/troika-3d-text
   */
  textProps?: TroikaTextProps;

  /** Same as `textProps` -- but the text content is explicitly set here */
  labelProps?: LabelProps;

  /** width of the container */
  width?: number;

  backgroundColor?: Color;
  backgroundOpacity?: number;
  position?: Vector3;
  scale?: Vector3;
  rotation?: Euler;

  /** [left/right , top/bottom] in % of width and height, respectively
   *
   * note that height is implicitly defined by the capHeight of the rendered
   * text. The cap height is dependant on both the `textProps.font` being used and the
   * `textProps.fontSize` value
   */
  padding?: [number, number];
};

/**
 * An Input field that is rendered in the canvas and bound
 * to a hidden HTML <\input\> element.
 */
const Input = forwardRef((props: Props, ref: Ref<HTMLInputElement>) => {
  const {
    onChange,
    type = "text",
    textProps,
    labelProps,
    width = 1.5,
    backgroundColor = "black",
    backgroundOpacity = 0.1,
    padding = [0.025, 0.1],
    ...restProps
  } = props;

  const [hovered, setHovered] = useState(false);
  useCursor(hovered, "text");

  // handle text defaults
  const fontSize = textProps?.fontSize || 0.0825;
  const fontColor = textProps?.color || "black";

  const paddingY = padding[1] * fontSize;
  const height = fontSize + paddingY * 2;

  // handle label defaults
  const labelSize = labelProps?.fontSize || 0.07;
  const labelColor = labelProps?.color || "black";

  return (
    <group {...restProps}>
      <Label
        position={[-width / 2, height / 1.8, 0]}
        color={labelColor}
        fontSize={labelSize}
        {...labelProps}
      />
      <Text
        ref={ref}
        width={width}
        padding={padding}
        height={height}
        onChange={onChange}
        type={type}
        fontSize={fontSize}
        color={fontColor}
        {...textProps}
      />

      <mesh
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        <boxGeometry args={[width, height, 0.01]} />
        <meshBasicMaterial
          color={backgroundColor}
          transparent
          opacity={backgroundOpacity}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
});

Input.displayName = "Input";

export default Input;
