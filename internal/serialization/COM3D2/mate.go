package COM3D2

import (
	"COM3D2_MOD_EDITOR_V2/internal/serialization/utilities"
	"fmt"
	"io"
)

// Mate 对应 .mate 文件的整体结构
// C# 对应：public class Mate
type Mate struct {
	Signature string
	Version   int32
	Name      string
	Material  *Material
}

// ReadMate 从 r 中读取一个 .mate 文件，返回 Mate 结构
func ReadMate(r io.Reader) (*Mate, error) {
	m := &Mate{}

	// 1. signature (string)
	sig, err := utilities.ReadString(r)
	if err != nil {
		return nil, fmt.Errorf("read .mate signature failed: %w", err)
	}
	if sig != MateSignature {
		return nil, fmt.Errorf("invalid .mate signature: got %q, want %s", sig, MateSignature)
	}
	m.Signature = sig

	// 2. version (int32)
	ver, err := utilities.ReadInt32(r)
	if err != nil {
		return nil, fmt.Errorf("read .mate version failed: %w", err)
	}
	m.Version = ver

	// 3. name (string)
	nameStr, err := utilities.ReadString(r)
	if err != nil {
		return nil, fmt.Errorf("read .mate name failed: %w", err)
	}
	m.Name = nameStr

	// 4. material (Material)
	mat, err := readMaterial(r)
	if err != nil {
		return nil, fmt.Errorf("read .mate material failed: %w", err)
	}
	m.Material = mat

	return m, nil
}

// Dump 将 Mate 写出到 w 中，格式与 .mate 兼容。
func (m *Mate) Dump(w io.Writer) error {
	// 1. signature
	if err := utilities.WriteString(w, m.Signature); err != nil {
		return fmt.Errorf("write .mate signature failed: %w", err)
	}
	// 2. version
	if err := utilities.WriteInt32(w, m.Version); err != nil {
		return fmt.Errorf("write .mate version failed: %w", err)
	}
	// 3. name
	if err := utilities.WriteString(w, m.Name); err != nil {
		return fmt.Errorf("write .mate name failed: %w", err)
	}
	// 4. material
	if m.Material != nil {
		if err := m.Material.Dump(w); err != nil {
			return fmt.Errorf("write .mate material failed: %w", err)
		}
	}
	return nil
}

// Material 及其属性解析
type Material struct {
	Name           string
	ShaderName     string
	ShaderFilename string
	Properties     []Property
}

// readMaterial 用于解析 Material 结构。
func readMaterial(r io.Reader) (*Material, error) {
	m := &Material{}

	// 1. name
	nameStr, err := utilities.ReadString(r)
	if err != nil {
		return nil, fmt.Errorf("read material.name failed: %w", err)
	}
	m.Name = nameStr

	// 2. shaderName
	shaderName, err := utilities.ReadString(r)
	if err != nil {
		return nil, fmt.Errorf("read material.shaderName failed: %w", err)
	}
	m.ShaderName = shaderName

	// 3. shaderFilename
	shaderFile, err := utilities.ReadString(r)
	if err != nil {
		return nil, fmt.Errorf("read material.shaderFilename failed: %w", err)
	}
	m.ShaderFilename = shaderFile

	// 4. properties (循环读取，直到遇到 "end" 字段)
	props := make([]Property, 0)
	for {
		peek, err := utilities.PeekString(r)
		if err != nil {
			return nil, fmt.Errorf("peek property type failed: %w", err)
		}
		if peek == "end" {
			// 消费掉 "end"
			_, _ = utilities.ReadString(r)
			break
		}
		// 根据不同的类型创建不同的 property
		prop, err := readProperty(r)
		if err != nil {
			return nil, err
		}
		props = append(props, prop)
	}

	m.Properties = props
	return m, nil
}

// Dump 将 Material 写出到 w 中。
func (mat *Material) Dump(w io.Writer) error {
	// 1. name
	if err := utilities.WriteString(w, mat.Name); err != nil {
		return fmt.Errorf("write material.name failed: %w", err)
	}
	// 2. shaderName
	if err := utilities.WriteString(w, mat.ShaderName); err != nil {
		return fmt.Errorf("write material.shaderName failed: %w", err)
	}
	// 3. shaderFilename
	if err := utilities.WriteString(w, mat.ShaderFilename); err != nil {
		return fmt.Errorf("write material.shaderFilename failed: %w", err)
	}

	// 4. 写出 properties
	for _, prop := range mat.Properties {
		if err := dumpProperty(w, prop); err != nil {
			return fmt.Errorf("write material property failed: %w", err)
		}
	}

	// 最后写出一个 "end" 标识，表示 property 列表结束
	if err := utilities.WriteString(w, "end"); err != nil {
		return fmt.Errorf("write properties end failed: %w", err)
	}

	return nil
}

// Property 是一个接口，对应 C# 里的抽象 class Property
// Go 中我们用接口 + 具体 struct 来表达
type Property interface {
	TypeName() string
}

// readProperty 根据下一段内容来解析 Property 的具体子类型
func readProperty(r io.Reader) (Property, error) {
	// 先读出 property 的 type 标识，比如 "tex", "col", "vec", "f"
	typeStr, err := utilities.ReadString(r)
	if err != nil {
		return nil, fmt.Errorf("read property type failed: %w", err)
	}

	// 先读一下 property 的 name (string)，每个子类都会有
	propName, err := utilities.ReadString(r)
	if err != nil {
		return nil, fmt.Errorf("read property name failed: %w", err)
	}

	switch typeStr {
	case "tex":
		// => TexProperty
		return readTexProperty(r, propName)
	case "col":
		// => ColProperty
		return readColProperty(r, propName)
	case "vec":
		// => VecProperty
		return readVecProperty(r, propName)
	case "f":
		// => FProperty
		return readFProperty(r, propName)
	default:
		return nil, fmt.Errorf("unknown property type: %q", typeStr)
	}
}

// dumpProperty 根据 Property 的子类型写出对应的数据
func dumpProperty(w io.Writer, prop Property) error {
	switch p := prop.(type) {
	case *TexProperty:
		// 写出类型标识 "tex"
		if err := utilities.WriteString(w, p.TypeName()); err != nil {
			return fmt.Errorf("write TexProperty type failed: %w", err)
		}
		// 写出属性名
		if err := utilities.WriteString(w, p.PropName); err != nil {
			return fmt.Errorf("write TexProperty name failed: %w", err)
		}
		// 写出子标签 (subTag): "tex2d"/"cube"/"texRT"
		if err := utilities.WriteString(w, p.SubTag); err != nil {
			return fmt.Errorf("write TexProperty subTag failed: %w", err)
		}
		// 根据 subTag 写出不同的内容
		switch p.SubTag {
		case "tex2d", "cube":
			if p.Tex2D == nil {
				return fmt.Errorf("TexProperty with subTag '%s' but Tex2D is nil", p.SubTag)
			}
			// 写出 Tex2DSubProperty
			if err := utilities.WriteString(w, p.Tex2D.Name); err != nil {
				return fmt.Errorf("write tex2d.name failed: %w", err)
			}
			if err := utilities.WriteString(w, p.Tex2D.Path); err != nil {
				return fmt.Errorf("write tex2d.path failed: %w", err)
			}
			if err := utilities.WriteFloat32(w, p.Tex2D.Offset[0]); err != nil {
				return fmt.Errorf("write tex2d.offset.x failed: %w", err)
			}
			if err := utilities.WriteFloat32(w, p.Tex2D.Offset[1]); err != nil {
				return fmt.Errorf("write tex2d.offset.y failed: %w", err)
			}
			if err := utilities.WriteFloat32(w, p.Tex2D.Scale[0]); err != nil {
				return fmt.Errorf("write tex2d.scale.x failed: %w", err)
			}
			if err := utilities.WriteFloat32(w, p.Tex2D.Scale[1]); err != nil {
				return fmt.Errorf("write tex2d.scale.y failed: %w", err)
			}
		case "texRT":
			if p.TexRT == nil {
				return fmt.Errorf("TexProperty with subTag 'texRT' but TexRT is nil")
			}
			// 写出 TexRTSubProperty
			if err := utilities.WriteString(w, p.TexRT.DiscardedStr1); err != nil {
				return fmt.Errorf("write texRT.discardedStr1 failed: %w", err)
			}
			if err := utilities.WriteString(w, p.TexRT.DiscardedStr2); err != nil {
				return fmt.Errorf("write texRT.discardedStr2 failed: %w", err)
			}
		default:
			return fmt.Errorf("unknown TexProperty subTag: %q", p.SubTag)
		}

	case *ColProperty:
		// 写出类型标识 "col"
		if err := utilities.WriteString(w, p.TypeName()); err != nil {
			return fmt.Errorf("write ColProperty type failed: %w", err)
		}
		// 写出属性名
		if err := utilities.WriteString(w, p.PropName); err != nil {
			return fmt.Errorf("write ColProperty name failed: %w", err)
		}
		// 写出四个 float32 (RGBA)
		for i, c := range p.Color {
			if err := utilities.WriteFloat32(w, c); err != nil {
				return fmt.Errorf("write ColProperty color[%d] failed: %w", i, err)
			}
		}

	case *VecProperty:
		// 写出类型标识 "vec"
		if err := utilities.WriteString(w, p.TypeName()); err != nil {
			return fmt.Errorf("write VecProperty type failed: %w", err)
		}
		// 写出属性名
		if err := utilities.WriteString(w, p.PropName); err != nil {
			return fmt.Errorf("write VecProperty name failed: %w", err)
		}
		// 写出四个 float32
		for i, v := range p.Vector {
			if err := utilities.WriteFloat32(w, v); err != nil {
				return fmt.Errorf("write VecProperty vector[%d] failed: %w", i, err)
			}
		}

	case *FProperty:
		// 写出类型标识 "f"
		if err := utilities.WriteString(w, p.TypeName()); err != nil {
			return fmt.Errorf("write FProperty type failed: %w", err)
		}
		// 写出属性名
		if err := utilities.WriteString(w, p.PropName); err != nil {
			return fmt.Errorf("write FProperty name failed: %w", err)
		}
		// 写出一个 float32
		if err := utilities.WriteFloat32(w, p.Number); err != nil {
			return fmt.Errorf("write FProperty float failed: %w", err)
		}

	default:
		// 如果出现未知类型，返回错误
		return fmt.Errorf("unknown property type: %T", p)
	}

	return nil
}

// -------------------------------------------------------------------
// 1) TexProperty

type TexProperty struct {
	PropName string
	SubTag   string
	Tex2D    *Tex2DSubProperty
	TexRT    *TexRTSubProperty
}

// 符合 interface
func (t *TexProperty) TypeName() string { return "tex" }

type Tex2DSubProperty struct {
	Name   string
	Path   string
	Offset [2]float32 // (x, y)
	Scale  [2]float32 // (x, y)
}
type TexRTSubProperty struct {
	DiscardedStr1 string
	DiscardedStr2 string
}

func readTexProperty(r io.Reader, propName string) (Property, error) {
	p := &TexProperty{PropName: propName}

	// 读取 subTag (string) => "tex2d" or "cube" or "texRT"
	subTag, err := utilities.ReadString(r)
	if err != nil {
		return nil, fmt.Errorf("read TexProperty subtag failed: %w", err)
	}
	p.SubTag = subTag

	switch subTag {
	case "tex2d", "cube":
		// 解析 Tex2DSubProperty
		var tex2d Tex2DSubProperty

		// name
		s1, err := utilities.ReadString(r)
		if err != nil {
			return nil, fmt.Errorf("read tex2d.name failed: %w", err)
		}
		tex2d.Name = s1

		// path
		s2, err := utilities.ReadString(r)
		if err != nil {
			return nil, fmt.Errorf("read tex2d.path failed: %w", err)
		}
		tex2d.Path = s2

		// offset (Float2)
		offsetX, err := utilities.ReadFloat32(r)
		if err != nil {
			return nil, fmt.Errorf("read tex2d.offset.x failed: %w", err)
		}
		offsetY, err := utilities.ReadFloat32(r)
		if err != nil {
			return nil, fmt.Errorf("read tex2d.offset.y failed: %w", err)
		}
		tex2d.Offset[0] = offsetX
		tex2d.Offset[1] = offsetY

		// scale (Float2)
		scaleX, err := utilities.ReadFloat32(r)
		if err != nil {
			return nil, fmt.Errorf("read tex2d.scale.x failed: %w", err)
		}
		scaleY, err := utilities.ReadFloat32(r)
		if err != nil {
			return nil, fmt.Errorf("read tex2d.scale.y failed: %w", err)
		}
		tex2d.Scale[0] = scaleX
		tex2d.Scale[1] = scaleY

		p.Tex2D = &tex2d

	case "texRT":
		// 解析 TexRTSubProperty
		var texRT TexRTSubProperty

		s1, err := utilities.ReadString(r)
		if err != nil {
			return nil, fmt.Errorf("read texRT.discardedStr1 failed: %w", err)
		}
		s2, err := utilities.ReadString(r)
		if err != nil {
			return nil, fmt.Errorf("read texRT.discardedStr2 failed: %w", err)
		}
		texRT.DiscardedStr1 = s1
		texRT.DiscardedStr2 = s2
		p.TexRT = &texRT

	default:
		return nil, fmt.Errorf("unknown TexProperty subTag: %q", subTag)
	}

	return p, nil
}

// -------------------------------------------------------------------
// 2) ColProperty => "col"

type ColProperty struct {
	PropName string
	Color    [4]float32 // RGBA
}

func (c *ColProperty) TypeName() string { return "col" }

func readColProperty(r io.Reader, propName string) (Property, error) {
	p := &ColProperty{PropName: propName}

	// 读取 4 个 float32
	var err error
	for i := 0; i < 4; i++ {
		p.Color[i], err = utilities.ReadFloat32(r)
		if err != nil {
			return nil, fmt.Errorf("read ColProperty color[%d] failed: %w", i, err)
		}
	}

	return p, nil
}

// -------------------------------------------------------------------
// 3) VecProperty => "vec"

type VecProperty struct {
	PropName string
	Vector   [4]float32
}

func (v *VecProperty) TypeName() string { return "vec" }

func readVecProperty(r io.Reader, propName string) (Property, error) {
	p := &VecProperty{PropName: propName}

	// 读取 4 个 float32
	var err error
	for i := 0; i < 4; i++ {
		p.Vector[i], err = utilities.ReadFloat32(r)
		if err != nil {
			return nil, fmt.Errorf("read VecProperty vector[%d] failed: %w", i, err)
		}
	}

	return p, nil
}

// -------------------------------------------------------------------
// 4) FProperty => "f"

type FProperty struct {
	PropName string
	Number   float32
}

func (f *FProperty) TypeName() string { return "f" }

func readFProperty(r io.Reader, propName string) (Property, error) {
	p := &FProperty{PropName: propName}

	val, err := utilities.ReadFloat32(r)
	if err != nil {
		return nil, fmt.Errorf("read FProperty float failed: %w", err)
	}
	p.Number = val
	return p, nil
}
