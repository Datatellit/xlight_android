/**
 * Created by 75932 on 2017/4/24.
 */
import React, {Component} from "react";
import {
    StyleSheet,
    View,
    Text,
    StatusBar,
    TouchableNativeFeedback,
    ToastAndroid,
    Image,
    ScrollView,
    NativeModules,
    TouchableOpacity,
    DeviceEventEmitter
} from "react-native";
import {connect} from "react-redux";
import {XIcon, XIonic} from "../component/XIcon";
import Slider from "react-native-slider";
import {setSceneId} from "../action/deviceAction";
import ActionSheet from "react-native-actionsheet";
import api from "../script/api";
import Modal from "react-native-modal";
import {ColorPicker, toRgb} from "react-native-color-picker";
import Button from "react-native-button";
import tinycolor from "tinycolor2";

const Controller = NativeModules.Controller;

class Light extends Component {
    constructor(props) {
        super(props);
        this.state = {
            colors: [
                "rgb(255,0,0)",
                "rgb(255,127,0)",
                "rgb(255,255,0)",
                "rgb(0,255,0)",
                "rgb(0,255,255)",
                "rgb(0,0,255)",
                "rgb(139,0,255)"
            ],
            color: "rgb(255,255,255)",
            useRing: 0,
            colorPicker: {
                visible: false
            }
        }
        this.selectRing = this.selectRing.bind(this)
    }

    componentDidMount() {
        //获取灯的实例，并设置到自身的State
        const node_id = this.props.navigation.state.params.id;
        const {devices} = this.props.deviceReducer;
        devices && devices.length > 0 && devices.forEach((light) => {
            if (node_id == light.id) {
                this.setState({...light});
                //进行连接
                Controller.Connect(light.coreId);
                //進行設備事件監聽
                Controller.ListenEvent(1, light.nodeNo);
            }
        });
        //获取场景
        const {Toast} = this.props.indexReducer.language;
        var accessToken = this.props.userReducer.user.access_token;
        //获取场景数据
        fetch(api.scene.scenes + "?access_token=" + accessToken).then(ret => ret.json()).then(ret => {
            if (ret.code == 1) {
                const scenes = ret.data.rows;
                this.setState({scenes: scenes});
            } else {
                //提示
                ToastAndroid.show(Toast.apiError, ToastAndroid.SHORT);
            }
        }).catch(err => {
            ToastAndroid.show(Toast.timeout, ToastAndroid.SHORT);
        });
        //将灯的场景写入
        setTimeout(() => {
            this.props.dispatch(setSceneId(this.state.scenarioId || 0));
        }, 1)
        //監聽設備事件
        DeviceEventEmitter.addListener("updateXDDevice", (data) => {
            // handle event.
            try {
                const device = JSON.parse(data.data);
                if (device.nd == this.state.nodeNo) {
                    //進行數據更新
                    if (this.isExist(device.BR) && device.BR != this.state.brightness) {
                        this.setState({brightness: device.BR});
                    }
                    if (this.isExist(device.CCT) && device.CCT != this.state.cct)
                        this.setState({cct: device.CCT});
                    if (this.isExist(device.State) && device.State != this.state.isOn)
                        this.setState({isOn: device.State});
                    if (this.isExist(device.R) && this.isExist(device.G) && this.isExist(device.B) && (device.R != this.getColor(0) || device.G != this.getColor(1) || device.B != this.getColor(2)))
                        this.setState({color: "rgb(" + device.R + "," + device.G + "," + device.B + ")"});
                }
            } catch (e) {
            }
        })
    }

    componentWillUnmount() {
        Controller.RemoveListenEvent();
        DeviceEventEmitter.removeListener("updateXDDevice");
    }

    isExist = (value) => {
        if (value || value == 0)
            return true
        else
            return false;
    }

    changeBrightness = () => {
        Controller.JSONCommand(JSON.stringify({cmd: 3, node_id: this.state.nodeNo, value: this.state.brightness}));
    }

    changeCCT = () => {
        Controller.JSONCommand(JSON.stringify({cmd: 5, node_id: this.state.nodeNo, value: this.state.cct}));
    }

    getColor = (i) => {
        //获取主值
        let color = this.state.color.substring(4, this.state.color.length - 1);
        return color.split(',')[i];
    }

    setColor = (rgb) => {
        this.setState({color: `rgb(${rgb.r},${rgb.g},${rgb.b})`}, () => {
            this.changeColor();
        })
    }

    changeColor = () => {
        Controller.JSONCommand(JSON.stringify({
            cmd: 2,
            node_id: this.state.nodeNo,
            ring: [0, 1, this.state.brightness, 0, this.getColor(0), this.getColor(1), this.getColor(2)]
        }));
    }

    changeState = () => {
        const state = this.state.isOn == 1 ? 0 : 1;
        Controller.JSONCommand(JSON.stringify({
            cmd: 1,
            node_id: this.state.nodeNo,
            state: state
        }));
        //this.setState({isOn: state});
    }

    getSceneName = () => {
        if (!this.state.scenarioName) {
            //找到场景名称
            this.state.scenes && this.state.scenes.length > 0 && this.state.scenes.forEach((scene) => {
                if (this.props.deviceReducer.sceneId == scene.id) {
                    this.setState({scenarioName: scene.scenarioname})
                }
            })
        }
        return this.state.scenarioName;
    }

    changeScene = (scene) => {
        let color;
        if (scene.scenarionodes && scene.scenarionodes.length)
            color = `rgb(${scene.scenarionodes[0].R},${scene.scenarionodes[0].G},${scene.scenarionodes[0].B})`
        else
            color = this.state.color;

        //应用场景数据
        this.setState({
            scenarioName: scene.scenarioname,
            scenarioId: scene.id,
            cct: scene.cct,
            brightness: scene.brightness,
            color: color
        });
        //调用改变场景（未对接）
    }

    selectRing = (index) => {
        if (index != 0) {
            //找到自己的
            this.setState({useRing: index});
        }
    }

    render() {
        const fontColor = "white";
        const lightFont = this.props.indexReducer.language.Page.Light;
        let colors = [];
        const selectIcon = (<XIonic name="ios-checkmark" size={15} color="black"/>);
        const options = [this.props.indexReducer.language.Toast.cancel];
        this.state.deviceRings && this.state.deviceRings.length > 0 && this.state.deviceRings.forEach((ring) => {
            options.push(ring.ringname);
        });
        this.state.colors && this.state.colors.forEach((val, index) => {
            colors.push((<View style={{flex:1}} key={`color_${index}`}>
                <TouchableOpacity
                    onPress={()=>{this.setState({color:val},()=>{ this.changeColor()});}}>
                    <View style={[styles.fastIcon,{backgroundColor:val}]}></View>
                </TouchableOpacity>
            </View>))
        });
        return (
            <View style={styles.container}>
                <View style={styles.top}>
                    <View style={[styles.header,{marginTop:this.props.indexReducer.marginTop}]}>
                        <View style={styles.leftIcon}>
                            <TouchableOpacity
                                onPress={()=>{this.props.navigation.goBack()}}>
                                <View>
                                    <XIcon name="angle-left" color={fontColor} size={28}/>
                                </View>
                            </TouchableOpacity>
                        </View>
                        <View style={{flex:5,alignItems:"center"}}>
                            <Text style={styles.headerText}>{this.state.deviceName}</Text>
                        </View>
                        <View style={{flex:1}}>

                        </View>
                    </View>
                    <View>
                        <Image source={require("../../assets/images/light.png")}></Image>
                    </View>
                </View>
                <ScrollView>
                    <View>
                        <View style={{alignItems:"center"}}>
                            <TouchableOpacity onPress={()=>{this.changeState()}} style={{alignItems:"center"}}>
                                <View
                                    style={styles.power}>
                                    <XIonic name="md-power" size={50} color={this.state.isOn==1?"#4370E5":"gray"}/>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={[styles.item,{flexDirection:"column"}]}
                        onPress={()=>{ this.props.navigation.navigate("Scenes",{callback:this.changeScene,sceneId:this.state.scenarioId})}}>
                        <View style={{flexDirection:"row"}}>
                            <View style={{flex:3,paddingLeft:5}}>
                                <Text
                                    style={styles.defaultSize}>{!this.state.scenarioId ? lightFont.selectScenario : this.getSceneName()}</Text>
                            </View>
                            <View style={{flex:1,alignItems:"flex-end",paddingRight:5}}>
                                <XIcon name="angle-right" size={25} color="#c7c7c7"/>
                            </View>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.item,{flexDirection:"column"}]}
                        onPress={()=>{ this.ActionSheet.show()}}>
                        <View style={{flexDirection:"row"}}>
                            <View style={{flex:3,paddingLeft:5}}>
                                <Text
                                    style={styles.defaultSize}>{!this.state.useRing ? lightFont.selectRing : this.state.deviceRings[this.state.useRing - 1].ringname}</Text>
                            </View>
                            <View style={{flex:1,alignItems:"flex-end",paddingRight:5}}>
                                {(this.state.useRing &&
                                <TouchableOpacity onPress={()=>{this.setState({useRing:0})}}>
                                    <View>
                                        <XIonic name="ios-close-circle" size={25} color={"#c7c7c7"}/>
                                    </View>
                                </TouchableOpacity>) || <XIcon name="angle-down" size={25} color="#c7c7c7"/>}
                            </View>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.pdSetting}>
                        <View style={{flex:1}}>
                            <Text style={[styles.settingSize,{flex:1}]}>
                                {lightFont.brightnessSetting}
                            </Text>
                        </View>
                        <View style={{flex:1,alignItems:"flex-end"}}>
                            <Text style={[styles.settingSize]}>
                                {this.state.brightness}
                            </Text>
                        </View>
                    </View>
                    <View
                        style={[styles.item,styles.noneMt]}>
                        <View style={{flex:1,alignItems:"center"}}>
                            <XIonic name="ios-sunny-outline" size={25} color="#333333"/>
                        </View>
                        <View style={{flex:7}}>
                            <Slider
                                style={{height:20}}
                                trackStyle={styles.track}
                                thumbStyle={styles.thumb}
                                minimumValue={0}
                                step={1}
                                maximumValue={100}
                                onValueChange={(val)=>this.setState({brightness:val})}
                                onSlidingComplete={()=>{
                                    this.changeBrightness();
                                }}
                                value={this.state.brightness||0}
                                minimumTrackTintColor='#4370e5'
                            />
                        </View>
                        <View style={{flex:1,alignItems:"center"}}>
                            <XIonic name="md-sunny" size={25} color="#333333"/>
                        </View>
                    </View>
                    <View style={styles.pdSetting}>
                        <View style={{flex:1}}>
                            <Text style={[styles.settingSize,{flex:1}]}>
                                {lightFont.cctSetting}
                            </Text>
                        </View>
                        <View style={{flex:1,alignItems:"flex-end"}}>
                            <Text style={[styles.settingSize]}>
                                {this.state.cct}
                            </Text>
                        </View>
                    </View>
                    <View
                        style={[styles.item,styles.noneMt]}>
                        <View style={{flex:1,alignItems:"center"}}>
                            <XIonic name="ios-sunny" size={25} color="#FAFD0C"/>
                        </View>
                        <View style={{flex:7}}>
                            <Slider
                                style={{height:20}}
                                trackStyle={styles.track}
                                thumbStyle={styles.thumb}
                                minimumValue={2700}
                                step={1}
                                maximumValue={6500}
                                onValueChange={(val)=>this.setState({cct:val})}
                                onSlidingComplete={()=>{
                                    this.changeCCT();
                                }}
                                value={this.state.cct||2700}
                                minimumTrackTintColor='#4370e5'
                            />
                        </View>
                        <View style={{flex:1,alignItems:"center"}}>
                            <XIonic name="ios-snow" size={25} color="#5ED7EC"/>
                        </View>
                    </View>
                    {this.state.deviceNodeType > 1 ? <View style={styles.pdSetting}>
                            <View style={{flex:1}}>
                                <Text style={[styles.settingSize,{flex:1}]}>
                                    {lightFont.colorSetting}
                                </Text>
                            </View>
                            <View style={{flex:1,alignItems:"flex-end"}}>
                                <View style={[styles.colorIcon,{backgroundColor:this.state.color,borderRadius:10}]}>
                                </View>
                            </View>
                        </View> : <View></View>}
                    {this.state.deviceNodeType > 1 ? <View
                            style={[styles.item,styles.noneMt]}>
                            <View style={{flex:8,flexDirection:"row"}}>
                                {colors}
                            </View>
                            <TouchableOpacity style={{flex:1}}
                                              onPress={()=>this.setState({colorPicker:{visible:true}})}>
                                <View style={{flex:1,alignItems:"center"}}>
                                    <XIonic name="ios-color-palette" size={25} color="#333"/>
                                </View>
                            </TouchableOpacity>
                        </View> : <View></View>}
                </ScrollView>
                <View>
                    <ActionSheet
                        ref={actionSheet => this.ActionSheet = actionSheet}
                        title={lightFont.selectRing}
                        options={options}
                        cancelButtonIndex={0}
                        onPress={this.selectRing}
                    />
                </View>
                <View>
                    <Modal isVisible={this.state.colorPicker.visible}>
                        <TouchableOpacity
                            onPress={()=>this.setState({colorPicker:{visible:false}})}>
                            <View style={{alignItems:"flex-end"}}>
                                <XIonic name="md-close" size={30} color="white"/>
                            </View>
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <ColorPicker
                                defaultColor={this.state.color}
                                onColorSelected={color=>{this.setState({picterColor:color})}}
                                style={{flex: 5}}
                            />
                            <View style={{flex:2,justifyContent:"center"}}>
                                <View style={{padding:20}}>
                                    <Button
                                        style={[styles.signBtn,styles.size20]}
                                        containerStyle={[styles.signContainer,styles.btnContainer]}
                                        onPress={() => {this.setColor(tinycolor(this.state.picterColor).toRgb());this.setState({colorPicker:{visible:false}})}}>
                                        {lightFont.select}
                                    </Button>
                                </View>
                            </View>
                        </View>
                    </Modal>
                </View>
            </View>);
    }
}

const fontColor = "white";
const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    defaultSize: {
        fontSize: 18,
        color: "#333333"
    },
    noneMt: {
        marginTop: 0
    },
    item: {
        padding: 10,
        backgroundColor: "white",
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginTop: 8
    },
    settingSize: {
        fontSize: 16,
        color: "#333333"
    },
    track: {
        height: 2,
        borderRadius: 1,
    },
    fastIcon: {
        width: 20,
        height: 20,
        borderRadius: 10
    },
    thumb: {
        width: 20,
        height: 20,
        borderRadius: 20 / 2,
        backgroundColor: 'white',
        shadowColor: 'black',
        shadowOffset: {width: 0, height: 2},
        shadowRadius: 2,
        shadowOpacity: 0.35,
        borderWidth: .5,
        top: 11
    },
    power: {
        alignItems: "center",
        borderRadius: 30,
        marginTop: 5,
        borderWidth: 5,
        height: 60,
        width: 60,
        borderColor: "white",
        backgroundColor: "rgb(255,255,255)"
    },
    colorIcon: {
        width: 20,
        height: 20
    },
    pdSetting: {
        paddingLeft: 10,
        paddingRight: 10,
        paddingBottom: 5,
        paddingTop: 5,
        flexDirection: "row"
    },
    mt5: {
        marginTop: 5
    },
    ml5: {
        marginLeft: 5
    },
    mt10: {
        marginTop: 10
    },
    headerText: {
        color: fontColor,
        fontSize: 17
    },
    leftIcon: {
        flex: 1, paddingLeft: 15
    },
    rightIcon: {
        flex: 1,
        alignItems: "flex-end",
        paddingRight: 15
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between"
    },
    white: {
        color: "white"
    },
    headerContent: {
        flex: 3,
        flexDirection: "row",
        justifyContent: "space-between"
    },
    top: {
        backgroundColor: "#4370E5",
        height: 240
    },
    size20: {
        fontSize: 20
    },
    signBtn: {
        color: '#333333'
    },
    btnContainer: {
        padding: 4, height: 35, overflow: 'hidden', borderRadius: 20,
    },
    signContainer: {
        backgroundColor: 'white'
    },
});

const mapStateToProps = (state) => ({
    indexReducer: state.indexReducer,
    userReducer: state.userReducer,
    deviceReducer: state.deviceReducer
});

export default connect(mapStateToProps)(Light);