package COM3D2

import (
	"COM3D2_MOD_EDITOR_V2/internal/serialization/utilities"
	"encoding/json"
	"fmt"
	"io"
)

// -------------------------------------------------------
// 定义 Col (ColliderFile) 的数据结构
// -------------------------------------------------------

type Col struct {
	Signature string      `json:"Signature"` // "CM3D21_COL"
	Version   int32       `json:"Version"`   // 24102
	Colliders []ICollider `json:"Colliders"`
}

// ICollider 是所有Collider的接口，不同具体类型各自实现。
type ICollider interface {
	TypeNameFunc() string
	Deserialize(r io.Reader, version int32) error
	Serialize(w io.Writer, version int32) error
}

// -------------------------------------------------------
// 一些Collider类型示例
// -------------------------------------------------------

// DynamicBoneColliderBase 基类
type DynamicBoneColliderBase struct {
	ParentName    string     `json:"ParentName"` // base.transform.parent.name
	SelfName      string     `json:"SelfName"`   // base.transform.name
	LocalPosition [3]float32 `json:"LocalPosition"`
	LocalRotation [4]float32 `json:"LocalRotation"`
	LocalScale    [3]float32 `json:"LocalScale"`

	Direction int32      `json:"Direction"` // (int)this.m_Direction
	Center    [3]float32 `json:"Center"`    // m_Center.x,y,z
	Bound     int32      `json:"Bound"`     // (int)this.m_Bound
}

func (c *DynamicBoneColliderBase) TypeNameFunc() string {
	return "base" // not in C#
}
func (c *DynamicBoneColliderBase) Deserialize(r io.Reader, version int32) error {
	data, err := ReadDynamicBoneColliderBase(r)
	if err != nil {
		return err
	}
	*c = data
	return nil
}
func (c *DynamicBoneColliderBase) Serialize(w io.Writer, version int32) error {
	return WriteDynamicBoneColliderBase(w, c)
}

// ReadDynamicBoneColliderBase 读取 DynamicBoneColliderBase 的数据
func ReadDynamicBoneColliderBase(r io.Reader) (DynamicBoneColliderBase, error) {
	var result DynamicBoneColliderBase
	var err error

	// 1. ParentName
	result.ParentName, err = utilities.ReadString(r)
	if err != nil {
		return result, fmt.Errorf("read parentName failed: %w", err)
	}

	// 2. SelfName
	result.SelfName, err = utilities.ReadString(r)
	if err != nil {
		return result, fmt.Errorf("read selfName failed: %w", err)
	}

	// 3. localPosition
	for i := 0; i < 3; i++ {
		result.LocalPosition[i], err = utilities.ReadFloat32(r)
		if err != nil {
			return result, fmt.Errorf("read localPosition[%d] failed: %w", i, err)
		}
	}

	// 4. localRotation
	for i := 0; i < 4; i++ {
		result.LocalRotation[i], err = utilities.ReadFloat32(r)
		if err != nil {
			return result, fmt.Errorf("read localRotation[%d] failed: %w", i, err)
		}
	}

	// 5. localScale
	for i := 0; i < 3; i++ {
		result.LocalScale[i], err = utilities.ReadFloat32(r)
		if err != nil {
			return result, fmt.Errorf("read localScale[%d] failed: %w", i, err)
		}
	}

	// 6. Direction
	result.Direction, err = utilities.ReadInt32(r)
	if err != nil {
		return result, fmt.Errorf("read direction failed: %w", err)
	}

	// 7. Center (x,y,z)
	for i := 0; i < 3; i++ {
		result.Center[i], err = utilities.ReadFloat32(r)
		if err != nil {
			return result, fmt.Errorf("read center[%d] failed: %w", i, err)
		}
	}

	// 8. Bound
	result.Bound, err = utilities.ReadInt32(r)
	if err != nil {
		return result, fmt.Errorf("read bound failed: %w", err)
	}

	return result, nil
}

func WriteDynamicBoneColliderBase(w io.Writer, baseData *DynamicBoneColliderBase) error {
	// 1. ParentName
	if err := utilities.WriteString(w, baseData.ParentName); err != nil {
		return fmt.Errorf("write parentName failed: %w", err)
	}
	// 2. SelfName
	if err := utilities.WriteString(w, baseData.SelfName); err != nil {
		return fmt.Errorf("write selfName failed: %w", err)
	}

	// 3. localPosition
	for i := 0; i < 3; i++ {
		if err := utilities.WriteFloat32(w, baseData.LocalPosition[i]); err != nil {
			return fmt.Errorf("write localPosition[%d] failed: %w", i, err)
		}
	}

	// 4. localRotation
	for i := 0; i < 4; i++ {
		if err := utilities.WriteFloat32(w, baseData.LocalRotation[i]); err != nil {
			return fmt.Errorf("write localRotation[%d] failed: %w", i, err)
		}
	}

	// 5. localScale
	for i := 0; i < 3; i++ {
		if err := utilities.WriteFloat32(w, baseData.LocalScale[i]); err != nil {
			return fmt.Errorf("write localScale[%d] failed: %w", i, err)
		}
	}

	// 6. Direction
	if err := utilities.WriteInt32(w, baseData.Direction); err != nil {
		return fmt.Errorf("write direction failed: %w", err)
	}

	// 7. Center
	for i := 0; i < 3; i++ {
		if err := utilities.WriteFloat32(w, baseData.Center[i]); err != nil {
			return fmt.Errorf("write center[%d] failed: %w", i, err)
		}
	}

	// 8. Bound
	if err := utilities.WriteInt32(w, baseData.Bound); err != nil {
		return fmt.Errorf("write bound failed: %w", err)
	}

	return nil
}

// DynamicBoneCollider 对应 "dbc"
type DynamicBoneCollider struct {
	Base *DynamicBoneColliderBase `json:"Base"`

	Radius float32 `json:"Radius"`
	Height float32 `json:"Height"`
}

func (c *DynamicBoneCollider) TypeNameFunc() string {
	return "dbc"
}
func (c *DynamicBoneCollider) Deserialize(r io.Reader, version int32) error {
	data, err := ReadDynamicBoneCollider(r)
	if err != nil {
		return err
	}
	*c = *data
	return nil
}
func (c *DynamicBoneCollider) Serialize(w io.Writer, version int32) error {
	return WriteDynamicBoneCollider(w, c)
}

func ReadDynamicBoneCollider(r io.Reader) (*DynamicBoneCollider, error) {
	baseData, err := ReadDynamicBoneColliderBase(r)
	if err != nil {
		return nil, fmt.Errorf("read base collider failed: %w", err)
	}

	// 读派生字段
	radius, err := utilities.ReadFloat32(r)
	if err != nil {
		return nil, fmt.Errorf("read m_Radius failed: %w", err)
	}
	height, err := utilities.ReadFloat32(r)
	if err != nil {
		return nil, fmt.Errorf("read m_Height failed: %w", err)
	}

	c := &DynamicBoneCollider{
		Base:   &baseData,
		Radius: radius,
		Height: height,
	}
	return c, nil
}

func WriteDynamicBoneCollider(w io.Writer, c *DynamicBoneCollider) error {
	// 先写基类字段
	if err := WriteDynamicBoneColliderBase(w, c.Base); err != nil {
		return fmt.Errorf("write base collider failed: %w", err)
	}
	// 再写派生字段
	if err := utilities.WriteFloat32(w, c.Radius); err != nil {
		return fmt.Errorf("write m_Radius failed: %w", err)
	}
	if err := utilities.WriteFloat32(w, c.Height); err != nil {
		return fmt.Errorf("write m_Height failed: %w", err)
	}
	return nil
}

// DynamicBonePlaneCollider 对应 "dpc"
// 在 C# 中并无其它独立字段，只继承基类。
type DynamicBonePlaneCollider struct {
	Base *DynamicBoneColliderBase `json:"Base"`
}

func (c *DynamicBonePlaneCollider) TypeNameFunc() string {
	return "dpc"
}
func (c *DynamicBonePlaneCollider) Deserialize(r io.Reader, version int32) error {
	data, err := ReadDynamicBonePlaneCollider(r)
	if err != nil {
		return err
	}
	*c = *data
	return nil
}
func (c *DynamicBonePlaneCollider) Serialize(w io.Writer, version int32) error {
	return WriteDynamicBonePlaneCollider(w, c)
}

// ReadDynamicBonePlaneCollider 对应C#的 Deserialize
func ReadDynamicBonePlaneCollider(r io.Reader) (*DynamicBonePlaneCollider, error) {
	baseData, err := ReadDynamicBoneColliderBase(r)
	if err != nil {
		return nil, fmt.Errorf("read base collider for plane failed: %w", err)
	}
	return &DynamicBonePlaneCollider{
		Base: &baseData,
	}, nil
}

// WriteDynamicBonePlaneCollider 对应C#的 Serialize
func WriteDynamicBonePlaneCollider(w io.Writer, c *DynamicBonePlaneCollider) error {
	if err := WriteDynamicBoneColliderBase(w, c.Base); err != nil {
		return fmt.Errorf("write base collider for plane failed: %w", err)
	}
	return nil
}

// DynamicBoneMuneCollider 对应 "dbm"
type DynamicBoneMuneCollider struct {
	Base *DynamicBoneColliderBase `json:"Base"`

	Radius          float32    `json:"Radius"`          // m_Radius
	Height          float32    `json:"Height"`          // m_Height
	ScaleRateMulMax float32    `json:"ScaleRateMulMax"` // m_fScaleRateMulMax
	CenterRateMax   [3]float32 `json:"CenterRateMax"`   // m_CenterRateMax.x,y,z

	// C# 里有 public Maid m_maid; 但是它并没有被 Serialize/Deserialize
	// 所以这里就不做二进制存储了。
}

func (c *DynamicBoneMuneCollider) TypeNameFunc() string {
	return "dbm"
}
func (c *DynamicBoneMuneCollider) Deserialize(r io.Reader, version int32) error {
	data, err := ReadDynamicBoneMuneCollider(r)
	if err != nil {
		return err
	}
	*c = *data
	return nil
}
func (c *DynamicBoneMuneCollider) Serialize(w io.Writer, version int32) error {
	return WriteDynamicBoneMuneCollider(w, c)
}

func ReadDynamicBoneMuneCollider(r io.Reader) (*DynamicBoneMuneCollider, error) {
	baseData, err := ReadDynamicBoneColliderBase(r)
	if err != nil {
		return nil, fmt.Errorf("read base collider failed: %w", err)
	}

	radius, err := utilities.ReadFloat32(r)
	if err != nil {
		return nil, fmt.Errorf("read m_Radius failed: %w", err)
	}
	height, err := utilities.ReadFloat32(r)
	if err != nil {
		return nil, fmt.Errorf("read m_Height failed: %w", err)
	}
	scaleRateMulMax, err := utilities.ReadFloat32(r)
	if err != nil {
		return nil, fmt.Errorf("read m_fScaleRateMulMax failed: %w", err)
	}

	var centerRateMax [3]float32
	for i := 0; i < 3; i++ {
		centerRateMax[i], err = utilities.ReadFloat32(r)
		if err != nil {
			return nil, fmt.Errorf("read m_CenterRateMax[%d] failed: %w", i, err)
		}
	}

	c := &DynamicBoneMuneCollider{
		Base:            &baseData,
		Radius:          radius,
		Height:          height,
		ScaleRateMulMax: scaleRateMulMax,
		CenterRateMax:   centerRateMax,
	}
	return c, nil
}

func WriteDynamicBoneMuneCollider(w io.Writer, c *DynamicBoneMuneCollider) error {
	// 1. 写基类字段
	if err := WriteDynamicBoneColliderBase(w, c.Base); err != nil {
		return fmt.Errorf("write base collider failed: %w", err)
	}

	// 2. 写派生类新增字段
	if err := utilities.WriteFloat32(w, c.Radius); err != nil {
		return fmt.Errorf("write m_Radius failed: %w", err)
	}
	if err := utilities.WriteFloat32(w, c.Height); err != nil {
		return fmt.Errorf("write m_Height failed: %w", err)
	}
	if err := utilities.WriteFloat32(w, c.ScaleRateMulMax); err != nil {
		return fmt.Errorf("write m_fScaleRateMulMax failed: %w", err)
	}
	for i := 0; i < 3; i++ {
		if err := utilities.WriteFloat32(w, c.CenterRateMax[i]); err != nil {
			return fmt.Errorf("write m_CenterRateMax[%d] failed: %w", i, err)
		}
	}

	return nil
}

// MissingCollider 对应 "missing"
type MissingCollider struct{}

func (m *MissingCollider) TypeNameFunc() string {
	return "missing"
}
func (m *MissingCollider) Deserialize(r io.Reader, version int32) error {
	// "missing" 字段什么都不做，typeName 已经在外层写了
	return nil
}
func (m *MissingCollider) Serialize(w io.Writer, version int32) error {
	// 同上，什么也不写
	return nil
}

// -------------------------------------------------------
// 读取 Col
// -------------------------------------------------------

// ReadCol 从二进制流里读取一个 Col
func ReadCol(r io.Reader) (*Col, error) {
	file := &Col{}

	// 1. Signature
	sig, err := utilities.ReadString(r)
	if err != nil {
		return nil, fmt.Errorf("read signature failed: %w", err)
	}
	//if sig != ColSignature {
	//	return nil, fmt.Errorf("invalid col signature, want %v, got %s", ColSignature, sig)
	//}
	file.Signature = sig

	// 2. Version
	ver, err := utilities.ReadInt32(r)
	if err != nil {
		return nil, fmt.Errorf("read version failed: %w", err)
	}
	file.Version = ver

	// 3. Collider count
	count, err := utilities.ReadInt32(r)
	if err != nil {
		return nil, fmt.Errorf("read collider count failed: %w", err)
	}

	// 4. 逐个读取 Collider
	file.Colliders = make([]ICollider, 0, count)
	for i := 0; i < int(count); i++ {
		typeName, err := utilities.ReadString(r)
		if err != nil {
			return nil, fmt.Errorf("read collider type string failed at index %d: %w", i, err)
		}

		var collider ICollider
		switch typeName {
		case "dbc":
			collider = &DynamicBoneCollider{}
		case "dpc":
			collider = &DynamicBonePlaneCollider{}
		case "dbm":
			collider = &DynamicBoneMuneCollider{}
		case "missing":
			collider = &MissingCollider{}
		default:
			return nil, fmt.Errorf("unrecognized collider type %q at index %d", typeName, i)
		}

		if err := collider.Deserialize(r, ver); err != nil {
			return nil, fmt.Errorf("collider.Deserialize failed at index %d: %w", i, err)
		}
		file.Colliders = append(file.Colliders, collider)
	}

	return file, nil
}

// -------------------------------------------------------
// 写出 Col
// -------------------------------------------------------

// Dump 把 Col 写出到 w 中
func (c *Col) Dump(w io.Writer) error {
	// 1. 写 Signature
	if err := utilities.WriteString(w, c.Signature); err != nil {
		return fmt.Errorf("write signature failed: %w", err)
	}
	// 2. 写 Version
	if err := utilities.WriteInt32(w, c.Version); err != nil {
		return fmt.Errorf("write version failed: %w", err)
	}
	// 3. 写 Collider count
	count := int32(len(c.Colliders))
	if err := utilities.WriteInt32(w, count); err != nil {
		return fmt.Errorf("write collider count failed: %w", err)
	}
	// 4. 遍历写出每个 collider
	for i, collider := range c.Colliders {
		typeName := collider.TypeNameFunc()
		// 先写 typeName
		if err := utilities.WriteString(w, typeName); err != nil {
			return fmt.Errorf("write collider type failed at index %d: %w", i, err)
		}
		// 写具体数据
		if err := collider.Serialize(w, c.Version); err != nil {
			return fmt.Errorf("collider.Serialize failed at index %d: %w", i, err)
		}
	}
	return nil
}

// UnmarshalJSON 为 Col 实现自定义 UnmarshalJSON
// 因为 Col 的 ICollider 字段是一个接口切片，需要根据 typeName 字段来决定反序列化为哪个具体类型
func (c *Col) UnmarshalJSON(data []byte) error {
	// 先定义一个中间结构来接住 Colliders 的原始数据
	// 其他字段 Signature / Version 可以直接接收
	type colAlias Col
	var temp struct {
		Colliders []json.RawMessage `json:"Colliders"`
		*colAlias
	}
	temp.colAlias = (*colAlias)(c)

	// 先把大部分字段 (Signature, Version) 解析出来
	if err := json.Unmarshal(data, &temp); err != nil {
		return err
	}

	// 此时 c.Signature 和 c.Version 已经有值了
	// 逐个解析 Colliders
	var result []ICollider
	for _, raw := range temp.Colliders {
		// 1. 先解析出 GetTypeName 用来分辨子类型
		var typeHolder struct {
			TypeName string `json:"GetTypeName"`
		}
		if err := json.Unmarshal(raw, &typeHolder); err != nil {
			return err
		}

		// 2. 根据 GetTypeName 创建对应的 collider 实例
		var collider ICollider
		switch typeHolder.TypeName {
		case "dbc":
			collider = &DynamicBoneCollider{}
		case "dpc":
			collider = &DynamicBonePlaneCollider{}
		case "dbm":
			collider = &DynamicBoneMuneCollider{}
		case "missing":
			collider = &MissingCollider{}
		default:
			return fmt.Errorf("unrecognized collider GetTypeName: %q", typeHolder.TypeName)
		}

		// 3. 用创建好的实例再去解析整个 JSON
		if err := json.Unmarshal(raw, collider); err != nil {
			return err
		}
		result = append(result, collider)
	}

	// 全部解析完毕，赋值给真实字段
	c.Colliders = result
	return nil
}
